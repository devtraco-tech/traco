import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DebugUserRole() {
  const { user } = useAuth();
  const { isAdmin, isCoordenador, canEditCourses, department, isLoading } = useUserRole();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="outline" onClick={() => navigate("/dashboard")} className="mb-4">
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Debug - Informações do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Auth User:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                {JSON.stringify(
                  {
                    id: user?.id,
                    email: user?.email,
                    name: user?.user_metadata?.name,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Role Information:</h3>
              <pre className="bg-muted p-4 rounded text-sm">
                {JSON.stringify(
                  {
                    isLoading,
                    isAdmin,
                    isCoordenador,
                    canEditCourses,
                    department: {
                      name: department?.name,
                      id: department?.id,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Check Console:</h3>
              <p className="text-sm text-muted-foreground">
                Abra o Developer Tools (F12) e vá na aba Console para ver os logs detalhados do carregamento do departamento.
              </p>
            </div>

            {isLoading && (
              <div className="text-sm text-muted-foreground">
                Carregando dados do usuário...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
