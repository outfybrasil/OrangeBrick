update storage.buckets set file_size_limit = 3145728 where id = 'post-images';
update storage.buckets set file_size_limit = 3145728 where id = 'profile-images';
update storage.buckets set file_size_limit = 52428800 where id = 'editorial-reels';
