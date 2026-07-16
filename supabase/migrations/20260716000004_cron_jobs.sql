SELECT cron.schedule('expire-packages', '0 0 * * *', 'SELECT public.expire_concluded_packages()');

SELECT cron.schedule('check-morosity', '0 6 * * *', 'SELECT public.check_payment_morosity()');

SELECT cron.schedule('review-requests', '0 10 * * *', 'SELECT public.inject_post_trip_review_request()');

SELECT cron.schedule('archive-old-packages', '0 0 * * 0', 'SELECT public.archive_old_concluded_packages()');
