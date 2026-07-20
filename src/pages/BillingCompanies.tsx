import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBillingCompanies, BillingCompany } from "@/hooks/useBillingCompanies";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BillingCompanyFormModal } from "@/components/billing/BillingCompanyFormModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Edit, Trash2, Search, Mail, Phone, MapPin, User } from "lucide-react";

const BillingCompanies = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<BillingCompany | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  const { billingCompanies, isLoading, createBillingCompany, updateBillingCompany, deleteBillingCompany } =
    useBillingCompanies();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Filter companies
  const filteredCompanies = billingCompanies?.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleCreateOrUpdate = (data: Omit<BillingCompany, "id" | "created_at" | "updated_at">) => {
    if (selectedCompany) {
      updateBillingCompany.mutate(
        { id: selectedCompany.id, ...data },
        {
          onSuccess: () => {
            setModalOpen(false);
            setSelectedCompany(null);
          },
        }
      );
    } else {
      createBillingCompany.mutate(data, {
        onSuccess: () => {
          setModalOpen(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (companyToDelete) {
      deleteBillingCompany.mutate(companyToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCompanyToDelete(null);
        },
      });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Empresas de Cobrança</h1>
          <p className="text-muted-foreground">Gerencie as empresas responsáveis pela cobrança dos cursos</p>
        </div>
        <Button
          onClick={() => {
            setSelectedCompany(null);
            setModalOpen(true);
          }}
        >
          <Building2 className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {filteredCompanies?.length || 0} empresa(s) encontrada(s)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    {company.cnpj && (
                      <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{company.contact_person}</span>
                </div>
              )}
              
              {company.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{company.phone}</span>
                </div>
              )}
              
              {company.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="line-clamp-2">{company.address}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCompany(company);
                    setModalOpen(true);
                  }}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setCompanyToDelete(company.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma empresa encontrada
          </CardContent>
        </Card>
      )}

      <BillingCompanyFormModal
        company={selectedCompany}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCompany(null);
        }}
        onSubmit={handleCreateOrUpdate}
        isSubmitting={createBillingCompany.isPending || updateBillingCompany.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingCompanies;
