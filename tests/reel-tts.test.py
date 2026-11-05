import asyncio
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("reel_tts", Path(__file__).resolve().parents[1] / "src/lib/video/reel-tts.py")
tts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tts)


class VoiceContinuityTests(unittest.TestCase):
    def test_provider_failure_never_switches_to_another_voice(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "test", "ELEVENLABS_VOICE_ID": "test"}):
                with patch.object(tts, "generate_elevenlabs", side_effect=RuntimeError("offline")):
                    with patch.object(tts, "generate_edge_tts") as edge:
                        with self.assertRaises(RuntimeError):
                            asyncio.run(tts.run_tts("O cartão é a chave.", "test", "+0%", Path(directory)))
                        edge.assert_not_called()

    def test_actual_word_timings_are_preserved_and_identified(self):
        sentences = [{"text": "O cartão.", "start": 0, "end": 2, "duration": 2}]
        words = [{"word": "O", "start": 0.1, "end": 0.2}, {"word": "cartão.", "start": 1, "end": 2}]
        with tempfile.TemporaryDirectory() as directory:
            tts.save_timing_files(Path(directory), sentences, "elevenlabs", words, "chosen-voice")
            self.assertEqual(json.loads((Path(directory) / "words.json").read_text()), words)
            metadata = json.loads((Path(directory) / "tts-provider.json").read_text())
            self.assertEqual(metadata["word_timing"], "provider-alignment")
            self.assertTrue(metadata["review_required"])

    def test_boundary_rounding_only_corrects_up_to_two_milliseconds(self):
        sentences = [{"text": "Uma frase.", "start": 0, "end": 3.088}, {"text": "Outra frase.", "start": 3.087, "end": 5.924}]
        corrected = tts.normalize_sentence_timings(sentences)
        self.assertEqual(corrected[1]["start"], corrected[0]["end"])
        self.assertEqual(corrected[1]["end"], 5.924)
        self.assertEqual(sentences[1]["start"], 3.087)
        sentences[1]["start"] = 2.9
        with self.assertRaises(ValueError):
            tts.normalize_sentence_timings(sentences)

    def test_incomplete_transcript_is_rejected(self):
        with self.assertRaises(ValueError):
            tts.validate_transcript("O cartão é obrigatório.", [{"text": "O cartão."}])


if __name__ == "__main__":
    unittest.main()
