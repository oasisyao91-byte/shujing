/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'img1.doubanio.com' },
      { protocol: 'https', hostname: 'img1.doubanio.com' },
      { protocol: 'http', hostname: 'img2.doubanio.com' },
      { protocol: 'https', hostname: 'img2.doubanio.com' },
      { protocol: 'http', hostname: 'img3.doubanio.com' },
      { protocol: 'https', hostname: 'img3.doubanio.com' },
      { protocol: 'http', hostname: 'img9.doubanio.com' },
      { protocol: 'https', hostname: 'img9.doubanio.com' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' }
    ]
  }
};

export default nextConfig;
