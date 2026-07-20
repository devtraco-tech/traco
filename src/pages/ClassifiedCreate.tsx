import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { ClassifiedForm } from "@/components/classified/ClassifiedForm";
import { useCreateClassified } from "@/hooks/useClassifieds";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ClassifiedCreate = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const createClassified = useCreateClassified();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = (data: any) => {
    const classifiedData = {
      ...data,
      price: data.price ? parseFloat(data.price) : null,
      expires_at: data.expires_at || null,
    };

    createClassified.mutate(classifiedData, {
      onSuccess: () => {
        navigate("/classifieds");
      },
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classifieds")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Novo Classificado</h1>
          <p className="text-muted-foreground">Crie um novo anúncio</p>
        </div>
      </div>

      <ClassifiedForm onSubmit={handleSubmit} isLoading={createClassified.isPending} />
    </div>
  );
};

export default ClassifiedCreate;
