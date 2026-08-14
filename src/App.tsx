import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { SdrLayout } from "./components/sdr/SdrLayout";
import { PatientLayout } from "./components/PatientLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useInitFontSize } from "./components/FontSizeControl";

const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CourseCreate = lazy(() => import("./pages/CourseCreate"));
const CourseEdit = lazy(() => import("./pages/CourseEdit"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const Validations = lazy(() => import("./pages/Validations"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Registrations = lazy(() => import("./pages/Registrations"));
const BillingCompanies = lazy(() => import("./pages/BillingCompanies"));
const PromotionalTeams = lazy(() => import("./pages/PromotionalTeams"));
const Users = lazy(() => import("./pages/Users"));
const Classifieds = lazy(() => import("./pages/Classifieds"));
const ClassifiedCreate = lazy(() => import("./pages/ClassifiedCreate"));
const ClassifiedEdit = lazy(() => import("./pages/ClassifiedEdit"));
const ClassifiedDetails = lazy(() => import("./pages/ClassifiedDetails"));
const ClassifiedPublicCreate = lazy(() => import("./pages/ClassifiedPublicCreate"));
const Leads = lazy(() => import("./pages/Leads"));
const PatientLeads = lazy(() => import("./pages/PatientLeads"));
const AllPatients = lazy(() => import("./pages/AllPatients"));
const PreTriageReception = lazy(() => import("./pages/PreTriageReception"));
const ClinicalTriageDentist = lazy(() => import("./pages/ClinicalTriageDentist"));
const CAPDistributionCoordinator = lazy(() => import("./pages/CAPDistributionCoordinator"));
const TriageDashboard = lazy(() => import("./pages/TriageDashboard"));
const SpecialtiesManager = lazy(() => import("./pages/admin/SpecialtiesManager"));
const DentistSchedule = lazy(() => import("./pages/admin/DentistSchedule"));
const Settings = lazy(() => import("./pages/Settings"));
const EmailNotificationsSettings = lazy(() => import("./pages/EmailNotificationsSettings"));
const DebugUserRole = lazy(() => import("./pages/DebugUserRole").then(m => ({ default: m.DebugUserRole })));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicCourses = lazy(() => import("./pages/PublicCourses"));
const PublicCourseDetails = lazy(() => import("./pages/PublicCourseDetails"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Logs = lazy(() => import("./pages/Logs"));
const ReceptionSchedule = lazy(() => import("./pages/ReceptionSchedule"));
const SdrConfiguration = lazy(() => import("./pages/ai/SdrConfiguration"));
const SdrLogin = lazy(() => import("./pages/sdr/SdrLogin"));
const SdrHome = lazy(() => import("./pages/sdr/SdrHome"));

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  useInitFontSize();
  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="abo-ui-theme" attribute="class">
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<SdrLogin />} />
            <Route path="/sdr/login" element={<SdrLogin />} />
            <Route
              path="/sdr"
              element={
                <ProtectedRoute loginPath="/sdr/login">
                  <SdrLayout>
                    <SdrHome />
                  </SdrLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sdr/configuracao"
              element={
                <ProtectedRoute loginPath="/sdr/login">
                  <SdrLayout>
                    <SdrConfiguration />
                  </SdrLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/sdr/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Courses />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CourseCreate />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CourseEdit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CourseDetails />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/validations"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Validations />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Teachers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/registrations"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Registrations />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classifieds"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Classifieds />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classifieds/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ClassifiedCreate />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classifieds/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ClassifiedDetails />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classifieds/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ClassifiedEdit />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing-companies"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BillingCompanies />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/promotional-teams"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PromotionalTeams />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Users />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Leads />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <AllPatients />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <PatientLeads />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pre-triagem"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <PreTriageReception />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/triagem-clinica"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <ClinicalTriageDentist />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cap-distribuicao"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <CAPDistributionCoordinator />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard-triagem"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <TriageDashboard />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/especialidades"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <SpecialtiesManager institution="ABO" />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/especialidades-unifan"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <SpecialtiesManager institution="UNIFAN" />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/agenda"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <DentistSchedule />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda-triagem"
              element={
                <ProtectedRoute>
                  <PatientLayout>
                    <ReceptionSchedule />
                  </PatientLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/email-notifications"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EmailNotificationsSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Logs />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inteligencia-artificial/sdr"
              element={<Navigate to="/sdr/configuracao" replace />}
            />
            <Route
              path="/debug/user-role"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DebugUserRole />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Public route for creating classifieds (no auth required) */}
            <Route path="/classificados/anunciar" element={<ClassifiedPublicCreate />} />
            
            {/* Public routes for courses (SEO optimized, no auth required) */}
            <Route path="/cursos" element={<PublicCourses />} />
            <Route path="/curso/:slug" element={<PublicCourseDetails />} />
            <Route path="/obrigado" element={<ThankYou />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
