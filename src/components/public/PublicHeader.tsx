import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { label: "Início", href: "https://abogoias.org.br/" },
  { label: "Quem Somos", href: "https://abogoias.org.br/quem-somos/" },
  { label: "Notícias", href: "https://abogoias.org.br/noticias/" },
  { label: "Cursos Abertos", href: "https://abogoias.org.br/cursos/" },
  { label: "Classificados", href: "https://abogoias.org.br/classificados/" },
  { label: "Contato", href: "https://abogoias.org.br/contato/" },
];

export function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="w-full absolute top-0 left-0 right-0 z-50">
      {/* Top Bar - Solid dark background */}
      <div className="hidden md:flex bg-[#0f0f1a] text-white justify-between items-center px-6 py-2">
        <a 
          href="/auth" 
          className="text-sm hover:underline"
        >
          Área Coordenador
        </a>
        <a
          href="https://abogoias.org.br/anuncie/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button 
            variant="outline" 
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white rounded-full px-6"
          >
            Cadastro
          </Button>
        </a>
      </div>

      {/* Main Header - Glass effect with gradient fade */}
      <div className="bg-gradient-to-b from-black/40 to-transparent backdrop-blur-[2px] text-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <a href="https://abogoias.org.br/" className="flex-shrink-0">
            <img
              src="https://abogoias.org.br/wp-content/webp-express/webp-images/uploads/2025/01/logo-abo.png.webp"
              alt="ABO Goiás - Associação Brasileira de Odontologia"
              className="h-12 md:h-14 w-auto"
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-white hover:text-blue-300 transition-colors text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-black/80 backdrop-blur-md border-t border-white/10">
            <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-white hover:text-blue-300 transition-colors py-2"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
                <a 
                  href="/auth" 
                  className="text-sm text-blue-300 hover:underline"
                >
                  Área Coordenador
                </a>
                <a
                  href="https://abogoias.org.br/anuncie/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button 
                    variant="outline" 
                    className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white rounded-full w-full"
                  >
                    Cadastro
                  </Button>
                </a>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
