import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="ABO Goiás — Sistema de Gerenciamento de Cursos e Clínica"
        description="Painel oficial da ABO Goiás para gestão de cursos de odontologia, classificados e triagem clínica."
        url="https://painel.abogoias.org.br/"
        type="website"
      />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-6 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-6 shadow-lg">
                <GraduationCap className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
                ABO Goiás — Gestão de Cursos e Clínica
              </h1>
              <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto">
                Sistema oficial da Associação Brasileira de Odontologia de Goiás para gerenciamento de cursos, classificados e triagem clínica.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/dashboard">
                  <Button size="lg" className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold h-14">
                    Painel de Cursos
                  </Button>
                </Link>
                <Link to="/dashboard-triagem">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold h-14">
                    Painel de Gestão Clínica
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
