-- 手动种子数据，用于当豆瓣爬虫均失败时兜底
insert into public.books (douban_id, title, author, publisher, publish_date, rating, rating_count, cover_url, summary, tags, isbn)
values
('4913064', '活着', '余华', '作家出版社', '2012-8', 9.4, 826315, 'https://img3.doubanio.com/view/subject/m/public/s29651121.jpg', '《活着(新版)》讲述了农村人福贵悲惨的人生遭遇。', '{"小说", "经典"}', '9787506365437'),
('1008145', '围城', '钱锺书', '人民文学出版社', '1991-2', 8.9, 412495, 'https://img3.doubanio.com/view/subject/m/public/s1070959.jpg', '钱锺书所著的长篇小说。', '{"小说", "经典"}', '9787020024759'),
('1046265', '百年孤独', '[哥伦比亚] 加西亚·马尔克斯', '南海出版公司', '2011-6', 9.3, 405391, 'https://img3.doubanio.com/view/subject/m/public/s6384944.jpg', '魔幻现实主义代表作。', '{"小说", "外国文学"}', '9787544253994')
on conflict (douban_id) do update set 
  title = excluded.title,
  author = excluded.author,
  rating = excluded.rating,
  rating_count = excluded.rating_count,
  cover_url = excluded.cover_url;
