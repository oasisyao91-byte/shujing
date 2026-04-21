export function Footer() {
  return (
    <footer className="py-6 border-t md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <div className="text-sm leading-loose text-center text-brand-muted md:text-left">
          <div>&copy; {new Date().getFullYear()} 书境 BookMind</div>
          <div className="text-xs">
            Oasia Yao 姚晓宇 创作 with AI ·{' '}
            <a href="mailto:oasisyao91@gmail.com" className="text-[#3A7AB5] hover:underline underline-offset-2">
              oasisyao91@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
