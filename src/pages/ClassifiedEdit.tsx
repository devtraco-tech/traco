import { useNavigate, useParams } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ClassifiedForm } from "@/components/classified/ClassifiedForm";
import { useClassified, useUpdateClassified } from "@/hooks/useClassifieds";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ClassifiedEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: classified, isLoading } = useClassified(id);
  const updateClassified = useUpdateClassified();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = (data: any) => {
    if (!id) return;

    const classifiedData = {
      id,
      ...data,
      price: data.price ? parseFloat(data.price) : null,
      expires_at: data.expires_at || null,
    };

    updateClassified.mutate(classifiedData, {
      onSuccess: () => {
        navigate("/classifieds");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Carregando...</div>
      </div>
    );
  }

  if (!classified) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Classificado não encontrado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classifieds")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Classificado</h1>
          <p className="text-muted-foreground">Atualize as informações do anúncio</p>
        </div>
      </div>

      <ClassifiedForm
        classified={classified}
        onSubmit={handleSubmit}
        isLoading={updateClassified.isPending}
      />
    </div>
  );
};

export default ClassifiedEdit;
