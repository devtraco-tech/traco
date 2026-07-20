import { Instagram, Facebook, Youtube } from "lucide-react";

const footerLinks = {
  legal: [
    { label: "Política de Privacidade", href: "https://abogoias.org.br/politica-de-privacidade/" },
    { label: "Termos de uso", href: "https://abogoias.org.br/termos-de-uso/" },
  ],
  services: [
    { label: "Quero ser paciente", href: "https://abogoias.org.br/paciente/" },
    { label: "Cadastro", href: "https://abogoias.org.br/anuncie/" },
  ],
  navigation: [
    { label: "Início", href: "https://abogoias.org.br/" },
    { label: "Quem Somos", href: "https://abogoias.org.br/quem-somos/" },
    { label: "Notícias", href: "https://abogoias.org.br/noticias/" },
    { label: "Cursos Abertos", href: "https://abogoias.org.br/cursos/" },
    { label: "Classificados", href: "https://abogoias.org.br/classificados/" },
    { label: "Contato", href: "https://abogoias.org.br/contato/" },
  ],
  social: [
    { label: "Instagram", href: "https://www.instagram.com/abogoias/", icon: Instagram },
    { label: "Facebook", href: "https://www.facebook.com/ABOgoias/", icon: Facebook },
    { label: "Youtube", href: "https://www.youtube.com/channel/UC_tK34Uy49yRarH8mYgfCCA", icon: Youtube },
  ],
};

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f0f1a] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Logo */}
          <div className="lg:col-span-2">
            <a href="https://abogoias.org.br/">
              <img
                src="https://abogoias.org.br/wp-content/webp-express/webp-images/uploads/2025/01/logo-abo.png.webp"
                alt="ABO Goiás - Associação Brasileira de Odontologia"
                className="h-20 w-auto"
              />
            </a>
          </div>

          {/* Legal Links */}
          <div>
            <nav className="flex flex-col space-y-2">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Services Links */}
          <div>
            <nav className="flex flex-col space-y-2">
              {footerLinks.services.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Navigation Links */}
          <div>
            <nav className="flex flex-col space-y-2">
              {footerLinks.navigation.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Social Links */}
          <div>
            <nav className="flex flex-col space-y-2">
              {footerLinks.social.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} ABO Goiás. Todos os direitos reservados.
          </p>
          <a
            href="https://traconegocios.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-2"
          >
            Desenvolvido por Traço Negócios:
            <img
              src="https://abogoias.org.br/wp-content/webp-express/webp-images/uploads/2025/02/logo-traco.png.webp"
              alt="Traço Negócios"
              className="h-4 w-auto"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
