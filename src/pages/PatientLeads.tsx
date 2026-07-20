import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientLeads, usePatientNotificationEmails } from "@/hooks/usePatientLeads";
import { useOldContacts } from "@/hooks/useOldContacts";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Clock, 
  Phone, 
  CheckCircle2, 
  Calendar,
  Eye,
  Trash2,
  Mail,
  Plus,
  Settings,
  UserCircle,
  MapPin,
  MessageSquare,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  Send,
  Activity
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PatientLead } from "@/hooks/usePatientLeads";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: <Clock className="h-3 w-3" /> },
  contacted: { label: "Contatado", color: "bg-blue-100 text-blue-800 border-blue-300", icon: <Phone className="h-3 w-3" /> },
  scheduled: { label: "Agendado", color: "bg-purple-100 text-purple-800 border-purple-300", icon: <Calendar className="h-3 w-3" /> },
  completed: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const genderLabels: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", 
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", 
  "SP", "SE", "TO"
];

interface CSVRow {
  celular: string;
  nome: string;
  cpf?: string;
  email?: string;
  gender?: string;
  birth_date?: string;
  state?: string;
  city?: string;
  message?: string;
  "Creation Date"?: string;
  "Modified Date"?: string;
}

type SortField = 'full_name' | 'mobile_phone' | 'city' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface OldContactCSVRow {
  celular: string;
  nome: string;
  "Creation Date"?: string;
  "Modified Date"?: string;
}

const PatientLeads = () => {
  const navigate = useNavigate();
  const { leads, isLoading, stats, updateLeadStatus, updateLeadNotes, deleteLead, bulkDeleteLeads, importLeads, sendToKommo: sendPatientToKommo, promoteToTriage, bulkPromoteToTriage } = usePatientLeads();
  const { emails, isLoading: emailsLoading, addEmail, updateEmail, deleteEmail } = usePatientNotificationEmails();
  const { contacts: oldContacts, isLoading: oldContactsLoading, importContacts, deleteContact, bulkDeleteContacts, totalCount: oldContactsCount, sendToKommo } = useOldContacts();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const [selectedLead, setSelectedLead] = useState<PatientLead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Multi-filter state for "Todos os Leads"
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [kommoFilter, setKommoFilter] = useState<"all" | "sent" | "not_sent">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Old Contacts Sorting
  const [oldContactSortField, setOldContactSortField] = useState<'nome' | 'celular' | 'creation_date'>('creation_date');
  const [oldContactSortDirection, setOldContactSortDirection] = useState<SortDirection>('desc');
  
  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  // Old Contacts bulk selection
  const [selectedOldContactIds, setSelectedOldContactIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOldContactsDialogOpen, setBulkDeleteOldContactsDialogOpen] = useState(false);
  
  // Migration from old contacts to patient leads
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [migrateDefaults, setMigrateDefaults] = useState({
    gender: "other",
    birth_date: "1990-01-01",
    state: "DF",
    city: "Não informado",
    message: "Contato migrado da base antiga",
  });
  
  // Email management
  const [newEmail, setNewEmail] = useState("");
  const [newEmailName, setNewEmailName] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // CSV Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [importDefaults, setImportDefaults] = useState({
    gender: "other",
    birth_date: "1990-01-01",
    state: "DF",
    city: "Não informado",
    message: "Lead importado via CSV",
  });
  const [importAsOldContacts, setImportAsOldContacts] = useState(false);
  const [sendToKommoAfterImport, setSendToKommoAfterImport] = useState(true);

  // Old Contacts CSV Import
  const oldContactsFileInputRef = useRef<HTMLInputElement>(null);
  const [oldContactsImportDialogOpen, setOldContactsImportDialogOpen] = useState(false);
  const [oldContactsCsvData, setOldContactsCsvData] = useState<OldContactCSVRow[]>([]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Old Contacts sorting
  const handleOldContactSort = (field: 'nome' | 'celular' | 'creation_date') => {
    if (oldContactSortField === field) {
      setOldContactSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOldContactSortField(field);
      setOldContactSortDirection('asc');
    }
  };

  const getOldContactSortIcon = (field: 'nome' | 'celular' | 'creation_date') => {
    if (oldContactSortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return oldContactSortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleToggleSelectOldContact = (id: string) => {
    const newSelected = new Set(selectedOldContactIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedOldContactIds(newSelected);
  };

  const handleToggleSelectAllOldContacts = () => {
    if (sortedOldContacts && selectedOldContactIds.size === sortedOldContacts.length) {
      setSelectedOldContactIds(new Set());
    } else {
      setSelectedOldContactIds(new Set(sortedOldContacts?.map(c => c.id) || []));
    }
  };

  const handleBulkDeleteOldContacts = () => {
    bulkDeleteContacts.mutate(Array.from(selectedOldContactIds), {
      onSuccess: () => {
        setSelectedOldContactIds(new Set());
        setBulkDeleteOldContactsDialogOpen(false);
      }
    });
  };

  const handleViewDetails = (lead: PatientLead) => {
    setSelectedLead(lead);
    setNotesValue(lead.notes || "");
    setDetailsOpen(true);
  };

  const handleToggleSelect = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (filteredLeads && selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads?.map(l => l.id) || []));
    }
  };

  const handleBulkDelete = () => {
    bulkDeleteLeads.mutate(Array.from(selectedLeadIds), {
      onSuccess: () => {
        setSelectedLeadIds(new Set());
        setBulkDeleteDialogOpen(false);
      }
    });
  };

  const handleSaveNotes = () => {
    if (selectedLead) {
      updateLeadNotes.mutate({ leadId: selectedLead.id, notes: notesValue });
    }
  };

  const handleStatusChange = (leadId: string, status: string) => {
    updateLeadStatus.mutate({ leadId, status });
  };

  const handleAddEmail = () => {
    if (newEmail) {
      addEmail.mutate({ email: newEmail, name: newEmailName || undefined });
      setNewEmail("");
      setNewEmailName("");
      setEmailDialogOpen(false);
    }
  };

  // CSV Import functions - properly handles quoted fields with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Push the last field
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const rows: CSVRow[] = [];
    
    
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      
      if (row.celular && row.nome) {
        rows.push({
          celular: row.celular,
          nome: row.nome,
          cpf: row.cpf || row.CPF,
          email: row.email || row.Email,
          gender: row.gender || row.Gender || row.sexo || row.Sexo,
          birth_date: row.birth_date || row["Data de Nascimento"] || row.data_nascimento,
          state: row.state || row.estado || row.UF,
          city: row.city || row.cidade || row.Cidade,
          message: row.message || row.mensagem || row.Observacao || row.observacoes,
          "Creation Date": row["Creation Date"] || row.created_at || row.data_criacao,
          "Modified Date": row["Modified Date"] || row.updated_at || row.data_modificacao,
        });
      }
    }
    
    return rows;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        toast({
          title: "Arquivo inválido",
          description: "O arquivo CSV deve ter as colunas 'celular' e 'nome'.",
          variant: "destructive",
        });
        return;
      }
      
      setCsvData(parsed);
      setImportDialogOpen(true);
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    const parseDate = (dateStr: string | undefined): string | undefined => {
      if (!dateStr || dateStr.trim() === '') return undefined;
      try {
        const cleanDateStr = dateStr.trim();
        
        
        // Month mappings (English full and abbreviated)
        const monthMap: Record<string, number> = {
          'jan': 0, 'january': 0,
          'feb': 1, 'february': 1,
          'mar': 2, 'march': 2,
          'apr': 3, 'april': 3,
          'may': 4,
          'jun': 5, 'june': 5,
          'jul': 6, 'july': 6,
          'aug': 7, 'august': 7,
          'sep': 8, 'sept': 8, 'september': 8,
          'oct': 9, 'october': 9,
          'nov': 10, 'november': 10,
          'dec': 11, 'december': 11,
          // Portuguese
          'jan.': 0, 'fev': 1, 'fev.': 1, 'mar.': 2, 'abr': 3, 'abr.': 3,
          'mai': 4, 'mai.': 4, 'jun.': 5, 'jul.': 6, 'ago': 7, 'ago.': 7,
          'set': 8, 'set.': 8, 'out': 9, 'out.': 9, 'nov.': 10, 'dez': 11, 'dez.': 11
        };
        
        // Pattern: "May 27, 2024 10:12 am" or "May 27, 2024 10:12:00 am"
        const pattern = /^([a-zA-Z]+\.?)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;
        const match = cleanDateStr.match(pattern);
        
        if (match) {
          const monthStr = match[1].toLowerCase();
          const day = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);
          let hour = parseInt(match[4], 10);
          const minute = parseInt(match[5], 10);
          const second = match[6] ? parseInt(match[6], 10) : 0;
          const ampm = match[7]?.toLowerCase();
          
          const month = monthMap[monthStr];
          if (month === undefined) {
            
            return undefined;
          }
          
          // Convert 12-hour to 24-hour format
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          
          // Create a Date object with the parsed components
          // The CSV data is in Brazil local time (UTC-3)
          // Use Date.UTC to create the date, then add 3 hours to convert to UTC
          const localDate = new Date(Date.UTC(year, month, day, hour, minute, second));
          // Add 3 hours to convert from Brazil time (UTC-3) to UTC
          localDate.setUTCHours(localDate.getUTCHours() + 3);
          
          const isoString = localDate.toISOString();
          
          return isoString;
        }
        
        // Fallback: try native Date parsing for ISO formats
        const nativeDate = new Date(cleanDateStr);
        if (!isNaN(nativeDate.getTime())) {
          
          return nativeDate.toISOString();
        }
        
        
        return undefined;
      } catch (e) {
        console.error('Date parse error:', e);
        return undefined;
      }
    };

    const leadsToImport = csvData.map(row => {
      let createdAt = parseDate(row["Creation Date"]);
      let updatedAt = parseDate(row["Modified Date"]);
      
      if (importAsOldContacts) {
        const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
        createdAt = createdAt || oldDate;
        updatedAt = updatedAt || oldDate;
      }

      
      return {
        full_name: row.nome,
        mobile_phone: row.celular,
        cpf: row.cpf || undefined,
        email: row.email || undefined,
        gender: row.gender || importDefaults.gender,
        birth_date: row.birth_date || importDefaults.birth_date,
        state: row.state || importDefaults.state,
        city: row.city || importDefaults.city,
        message: row.message || importDefaults.message,
        status: 'pending',
        // Only include dates if they were successfully parsed
        // Otherwise let the database use default (now())
        ...(createdAt && { created_at: createdAt }),
        ...(updatedAt && { updated_at: updatedAt }),
      };
    });

    importLeads.mutate(leadsToImport, {
      onSuccess: (count) => {
        setImportDialogOpen(false);
        setCsvData([]);
        
        if (sendToKommoAfterImport) {
          // After local import, we need to find the new leads IDs to send to Kommo
          // Since importLeads returns the inserted rows, we can use them
          // But wait, the mutation returns the count. 
          // Re-fetching leads and sending those without kommo_lead_id might be better,
          // or we can modify the mutation to return the data.
          // Actually, let's just toast and the user can send manually, 
          // OR we can trigger a sync for all unsent leads.
          toast({
            title: "Leads importados",
            description: `${count} leads foram importados. Você pode enviá-los ao Kommo agora ou manualmente depois.`,
          });
        }
      }
    });
  };

  const filteredLeads = (() => {
    // Basic filter: start with leads that are NOT 'completed' (unless explicitly filtered for completed)
    let baseLeads = leads?.filter(l => l.status !== 'completed') || [];

    // Apply status filter if not "all"
    let result = statusFilter === "all"
      ? baseLeads
      : leads?.filter(l => l.status === statusFilter) || [];

    // Multi-filter: search by name, email, phone
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(l =>
        (l.full_name || '').toLowerCase().includes(q) ||
        (l.mobile_phone || '').toLowerCase().includes(q) ||
        (l.message || '').toLowerCase().includes(q)
      );
    }

    // Kommo filter
    if (kommoFilter === "sent") result = result.filter(l => !!l.kommo_lead_id);
    else if (kommoFilter === "not_sent") result = result.filter(l => !l.kommo_lead_id);

    // State filter
    if (stateFilter !== "all") {
      result = result.filter(l => l.state === stateFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter(l => l.created_at && new Date(l.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // include the full day
      result = result.filter(l => l.created_at && new Date(l.created_at).getTime() <= to);
    }

    if (result) {
      result = [...result].sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';
        
        switch (sortField) {
          case 'full_name':
            aValue = (a.full_name || '').toLowerCase();
            bValue = (b.full_name || '').toLowerCase();
            break;
          case 'mobile_phone':
            aValue = a.mobile_phone || '';
            bValue = b.mobile_phone || '';
            break;
          case 'city':
            aValue = (a.city || '').toLowerCase();
            bValue = (b.city || '').toLowerCase();
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'created_at':
            aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
            bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
            break;
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  })();

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0) +
    (kommoFilter !== "all" ? 1 : 0) +
    (stateFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter("all");
    setSearchTerm("");
    setKommoFilter("all");
    setStateFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Sorted Old Contacts
  const sortedOldContacts = (() => {
    if (!oldContacts) return [];
    
    return [...oldContacts].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      switch (oldContactSortField) {
        case 'nome':
          aValue = (a.nome || '').toLowerCase();
          bValue = (b.nome || '').toLowerCase();
          break;
        case 'celular':
          aValue = a.celular || '';
          bValue = b.celular || '';
          break;
        case 'creation_date':
          aValue = a.creation_date ? new Date(a.creation_date).getTime() : 0;
          bValue = b.creation_date ? new Date(b.creation_date).getTime() : 0;
          break;
      }
      
      if (aValue < bValue) return oldContactSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return oldContactSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  })();

  // Old Contacts CSV Import handling
  const handleOldContactsFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseOldContactsCSV(text);
      
      if (parsed.length === 0) {
        toast({
          title: "Arquivo inválido",
          description: "O arquivo CSV deve ter as colunas 'celular' e 'nome'.",
          variant: "destructive",
        });
        return;
      }
      
      setOldContactsCsvData(parsed);
      setOldContactsImportDialogOpen(true);
    };
    reader.readAsText(file);
    
    if (oldContactsFileInputRef.current) {
      oldContactsFileInputRef.current.value = '';
    }
  };

  const parseOldContactsCSV = (text: string): OldContactCSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const rows: OldContactCSVRow[] = [];
    
    
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      if (row.celular && row.nome) {
        rows.push({
          celular: row.celular,
          nome: row.nome,
          "Creation Date": row["Creation Date"],
          "Modified Date": row["Modified Date"],
        });
      }
    }
    
    return rows;
  };

  const handleOldContactsImport = () => {
    const parseDate = (dateStr: string | undefined): string | undefined => {
      if (!dateStr || dateStr.trim() === '') return undefined;
      try {
        const cleanDateStr = dateStr.trim();
        
        const monthMap: Record<string, number> = {
          'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
          'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
          'aug': 7, 'august': 7, 'sep': 8, 'sept': 8, 'september': 8, 'oct': 9, 'october': 9,
          'nov': 10, 'november': 10, 'dec': 11, 'december': 11,
          'jan.': 0, 'fev': 1, 'fev.': 1, 'mar.': 2, 'abr': 3, 'abr.': 3,
          'mai': 4, 'mai.': 4, 'jun.': 5, 'jul.': 6, 'ago': 7, 'ago.': 7,
          'set': 8, 'set.': 8, 'out': 9, 'out.': 9, 'nov.': 10, 'dez': 11, 'dez.': 11
        };
        
        const pattern = /^([a-zA-Z]+\.?)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;
        const match = cleanDateStr.match(pattern);
        
        if (match) {
          const monthStr = match[1].toLowerCase();
          const day = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);
          let hour = parseInt(match[4], 10);
          const minute = parseInt(match[5], 10);
          const second = match[6] ? parseInt(match[6], 10) : 0;
          const ampm = match[7]?.toLowerCase();
          
          const month = monthMap[monthStr];
          if (month === undefined) return undefined;
          
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          
          // Use Date object to properly handle day rollover when adding timezone offset
          const localDate = new Date(Date.UTC(year, month, day, hour, minute, second));
          localDate.setUTCHours(localDate.getUTCHours() + 3);
          return localDate.toISOString();
        }
        
        const nativeDate = new Date(cleanDateStr);
        if (!isNaN(nativeDate.getTime())) {
          return nativeDate.toISOString();
        }
        
        return undefined;
      } catch {
        return undefined;
      }
    };

    const contactsToImport = oldContactsCsvData.map(row => {
      let createdAt = parseDate(row["Creation Date"]);
      let updatedAt = parseDate(row["Modified Date"]);

      if (importAsOldContacts) {
        const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
        createdAt = createdAt || oldDate;
        updatedAt = updatedAt || oldDate;
      }

      return {
        nome: row.nome,
        celular: row.celular,
        creation_date: createdAt,
        modified_date: updatedAt,
      };
    });

    importContacts.mutate(contactsToImport, {
      onSuccess: () => {
        setOldContactsImportDialogOpen(false);
        setOldContactsCsvData([]);
      }
    });
  };

  // Handle migration from old contacts to patient leads
  const handleMigrateContacts = () => {
    const selectedContacts = oldContacts?.filter(c => selectedOldContactIds.has(c.id)) || [];
    
    const leadsToCreate = selectedContacts.map(contact => ({
      full_name: contact.nome,
      mobile_phone: contact.celular,
      gender: migrateDefaults.gender,
      birth_date: migrateDefaults.birth_date,
      state: migrateDefaults.state,
      city: migrateDefaults.city,
      message: migrateDefaults.message,
      status: 'pending',
      // Preserve creation date from old contact if available
      ...(contact.creation_date && { created_at: contact.creation_date }),
    }));

    importLeads.mutate(leadsToCreate, {
      onSuccess: () => {
        // Optionally delete the old contacts after migration
        bulkDeleteContacts.mutate(Array.from(selectedOldContactIds), {
          onSuccess: () => {
            setMigrateDialogOpen(false);
            setSelectedOldContactIds(new Set());
            toast({
              title: "Migração concluída",
              description: `${leadsToCreate.length} contatos foram migrados para leads de pacientes.`,
            });
          }
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie os leads de contato de pacientes</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          {isAdmin && selectedLeadIds.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedLeadIds.size})
            </Button>
          )}
          {selectedLeadIds.size > 0 && (
            <Button 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const selected = leads?.filter(l => selectedLeadIds.has(l.id)) || [];
                bulkPromoteToTriage.mutate(selected, {
                  onSuccess: () => setSelectedLeadIds(new Set()),
                });
              }}
              disabled={bulkPromoteToTriage.isPending}
            >
              <Activity className="h-4 w-4 mr-2" />
              {bulkPromoteToTriage.isPending ? "Promovendo..." : `Promover à Fila 1 (${selectedLeadIds.size})`}
            </Button>
          )}
          {selectedLeadIds.size > 0 && (
            <Button 
              variant="default"
              onClick={() => {
                const selected = leads?.filter(l => selectedLeadIds.has(l.id)) || [];
                const notSent = selected.filter(l => !l.kommo_lead_id);
                if (notSent.length === 0) {
                  toast({
                    title: "Todos já enviados",
                    description: "Os leads selecionados já foram enviados ao Kommo.",
                  });
                  return;
                }
                sendPatientToKommo.mutate(notSent, {
                  onSuccess: () => setSelectedLeadIds(new Set()),
                });
              }}
              disabled={sendPatientToKommo.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendPatientToKommo.isPending ? "Enviando..." : `Enviar ao Kommo (${selectedLeadIds.size})`}
            </Button>
          )}
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const unsent = leads?.filter(l => !l.kommo_lead_id) || [];
              if (unsent.length === 0) {
                toast({
                  title: "Sincronização concluída",
                  description: "Todos os leads já foram enviados ao Kommo.",
                });
                return;
              }
              sendPatientToKommo.mutate(unsent);
            }}
            disabled={sendPatientToKommo.isPending || !leads || leads.length === 0}
          >
            <History className="h-4 w-4 mr-2" />
            Sincronizar Pendentes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-xs text-muted-foreground">Contatados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-xs text-muted-foreground">Agendados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads de Pacientes</TabsTrigger>
          <TabsTrigger value="old-contacts">
            <History className="h-4 w-4 mr-2" />
            Contatos antigos
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Settings className="h-4 w-4 mr-2" />
            Emails de Notificação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {/* Multi-filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filtros</CardTitle>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Limpar filtros ({activeFilterCount})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Buscar (nome, telefone, mensagem)</Label>
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="contacted">Contatados</SelectItem>
                      <SelectItem value="scheduled">Agendados</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Enviado ao Kommo</Label>
                  <Select value={kommoFilter} onValueChange={(v) => setKommoFilter(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sent">Enviados</SelectItem>
                      <SelectItem value="not_sent">Não enviados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={stateFilter} onValueChange={setStateFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {brazilianStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">De (data de criação)</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Até (data de criação)</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {filteredLeads?.length || 0} resultado(s)
              </p>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardContent className="pt-6">
              {filteredLeads && filteredLeads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                          onCheckedChange={handleToggleSelectAll}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('full_name')}
                      >
                        <div className="flex items-center">
                          Nome
                          {getSortIcon('full_name')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('mobile_phone')}
                      >
                        <div className="flex items-center">
                          Contato
                          {getSortIcon('mobile_phone')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('city')}
                      >
                        <div className="flex items-center">
                          Localização
                          {getSortIcon('city')}
                        </div>
                      </TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Data
                          {getSortIcon('created_at')}
                        </div>
                      </TableHead>
                      <TableHead>Kommo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={() => handleToggleSelect(lead.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{lead.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {genderLabels[lead.gender] || lead.gender || '-'}
                            {lead.birth_date ? ` • ${format(new Date(lead.birth_date), "dd/MM/yyyy")}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.mobile_phone}</div>
                          {lead.landline_phone && (
                            <div className="text-xs text-muted-foreground">{lead.landline_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.city}</div>
                          <div className="text-xs text-muted-foreground">{lead.state}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-[200px] truncate" title={lead.message}>
                            {lead.message}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={lead.status || 'pending'} 
                            onValueChange={(value) => handleStatusChange(lead.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue>
                                <Badge variant="outline" className={statusConfig[lead.status || 'pending']?.color || ''}>
                                  {statusConfig[lead.status || 'pending']?.icon}
                                  <span className="ml-1">{statusConfig[lead.status || 'pending']?.label || lead.status}</span>
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    {config.icon}
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {lead.created_at ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[11px] font-medium text-foreground whitespace-nowrap" title={`Criado em: ${format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}`}>
                                Criado há {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR })}
                              </span>
                              <Badge variant="outline" className="w-fit font-bold text-[9px] rounded-lg border-muted text-muted-foreground bg-muted/20 uppercase" title="Tempo no status atual">
                                Status: {formatDistanceToNow(new Date(lead.updated_at || lead.created_at), { locale: ptBR })}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.kommo_lead_id ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              title="Promover à Fila 1 (Recepção)"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => promoteToTriage.mutate(lead)}
                              disabled={promoteToTriage.isPending}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewDetails(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o lead de {lead.full_name}? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteLead.mutate(lead.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum lead encontrado</h3>
                  <p className="text-muted-foreground">
                    Os leads de pacientes aparecerão aqui quando forem enviados pelo formulário.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Emails de Notificação</CardTitle>
                  <CardDescription>
                    Configure os emails que receberão notificações quando novos pacientes entrarem em contato.
                  </CardDescription>
                </div>
                <Button onClick={() => setEmailDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emailsLoading ? (
                <Skeleton className="h-32" />
              ) : emails && emails.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emails.map((email) => (
                      <TableRow key={email.id}>
                        <TableCell>
                          <div className="font-medium">{email.name || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {email.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={email.is_active}
                            onCheckedChange={(checked) => 
                              updateEmail.mutate({ id: email.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover email?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {email.email} da lista de notificações?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteEmail.mutate(email.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum email configurado</h3>
                  <p className="text-muted-foreground">
                    Adicione emails para receber notificações de novos pacientes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Old Contacts Tab */}
        <TabsContent value="old-contacts" className="space-y-4">
          {/* Explanatory legend */}
          <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
            <CardContent className="pt-5 pb-5 flex items-start gap-3">
              <div className="text-2xl shrink-0">📂</div>
              <div className="space-y-1">
                <p className="font-bold text-sm">O que são os Contatos Antigos?</p>
                <p className="text-sm text-muted-foreground">
                  São leads históricos importados via planilha (base anterior). Use esta área para
                  reativá-los: selecione contatos e envie ao Kommo, ou migre-os para a base de Leads de Pacientes.
                  A coluna <strong>Kommo</strong> indica se o contato já foi sincronizado.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Contatos Antigos</CardTitle>
                  <CardDescription>
                    {oldContactsCount} contatos importados da planilha antiga
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={oldContactsFileInputRef}
                    accept=".csv"
                    onChange={handleOldContactsFileUpload}
                    className="hidden"
                  />
                  {selectedOldContactIds.size > 0 && (
                    <>
                      <Button 
                        variant="default"
                        onClick={() => {
                          const selected = oldContacts.filter(c => selectedOldContactIds.has(c.id));
                          const notSent = selected.filter(c => !c.kommo_sent);
                          if (notSent.length === 0) {
                            toast({
                              title: "Todos já enviados",
                              description: "Os contatos selecionados já foram enviados ao Kommo.",
                            });
                            return;
                          }
                          sendToKommo.mutate(notSent, {
                            onSuccess: () => setSelectedOldContactIds(new Set()),
                          });
                        }}
                        disabled={sendToKommo.isPending}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendToKommo.isPending ? "Enviando..." : `Enviar ao Kommo (${selectedOldContactIds.size})`}
                      </Button>
                      <Button 
                        variant="default"
                        onClick={() => setMigrateDialogOpen(true)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Migrar para Leads ({selectedOldContactIds.size})
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="destructive" 
                          onClick={() => setBulkDeleteOldContactsDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir ({selectedOldContactIds.size})
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline" onClick={() => oldContactsFileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {oldContactsLoading ? (
                <Skeleton className="h-32" />
              ) : sortedOldContacts && sortedOldContacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={sortedOldContacts.length > 0 && selectedOldContactIds.size === sortedOldContacts.length}
                          onCheckedChange={handleToggleSelectAllOldContacts}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOldContactSort('nome')}
                      >
                        <div className="flex items-center">
                          Nome
                          {getOldContactSortIcon('nome')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOldContactSort('celular')}
                      >
                        <div className="flex items-center">
                          Celular
                          {getOldContactSortIcon('celular')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleOldContactSort('creation_date')}
                      >
                        <div className="flex items-center">
                          Data Criação
                          {getOldContactSortIcon('creation_date')}
                        </div>
                      </TableHead>
                      <TableHead>Data Modificação</TableHead>
                      <TableHead>Kommo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOldContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOldContactIds.has(contact.id)}
                            onCheckedChange={() => handleToggleSelectOldContact(contact.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{contact.nome}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{contact.celular}</div>
                        </TableCell>
                        <TableCell>
                          {contact.creation_date ? (
                            <div className="text-sm">
                              {format(new Date(contact.creation_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.modified_date ? (
                            <div className="text-sm">
                              {format(new Date(contact.modified_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.kommo_sent ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o contato de {contact.nome}? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteContact.mutate(contact.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum contato antigo</h3>
                  <p className="text-muted-foreground">
                    Importe sua planilha de contatos antigos usando o botão acima.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lead Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nome Completo</Label>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedLead.full_name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Sexo</Label>
                  <p className="font-medium">{genderLabels[selectedLead.gender] || selectedLead.gender}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Data de Nascimento</Label>
                  <p className="font-medium">
                    {selectedLead.birth_date ? format(new Date(selectedLead.birth_date), "dd/MM/yyyy") : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Localização</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedLead.city}, {selectedLead.state}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Celular</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedLead.mobile_phone}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Telefone Fixo</Label>
                  <p className="font-medium">{selectedLead.landline_phone || "-"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Mensagem (Tratamento desejado)</Label>
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                  <p>{selectedLead.message}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações internas</Label>
                <Textarea 
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Adicione observações sobre este paciente..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {selectedLead.created_at 
                    ? `Recebido em ${format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                    : "Data não disponível"}
                </div>
                <Select 
                  value={selectedLead.status} 
                  onValueChange={(value) => {
                    handleStatusChange(selectedLead.id, value);
                    setSelectedLead({ ...selectedLead, status: value });
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                onClick={() => {
                  if (selectedLead) {
                    promoteToTriage.mutate(selectedLead, {
                      onSuccess: () => setDetailsOpen(false)
                    });
                  }
                }}
                disabled={promoteToTriage.isPending}
              >
                <Activity className="h-4 w-4 mr-2" />
                {promoteToTriage.isPending ? "Promovendo..." : "Promover à Fila 1 (Recepção)"}
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
            </div>
            <Button onClick={handleSaveNotes} disabled={updateLeadNotes.isPending}>
              Salvar Observações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Email de Notificação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailName">Nome (opcional)</Label>
              <Input
                id="emailName"
                value={newEmailName}
                onChange={(e) => setNewEmailName(e.target.value)}
                placeholder="Ex: Dr. João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddEmail} disabled={!newEmail || addEmail.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Leads do CSV
            </DialogTitle>
            <DialogDescription>
              {csvData.length} leads encontrados no arquivo. Configure os valores padrão para os campos não presentes no CSV.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Campos do CSV detectados:</p>
                <p className="text-amber-700">
                  celular, nome
                  {csvData.some(r => r["Creation Date"]) && ", Creation Date"}
                  {csvData.some(r => r["Modified Date"]) && ", Modified Date"}
                </p>
                {csvData.some(r => r["Creation Date"] || r["Modified Date"]) && (
                  <p className="text-green-600 mt-1">✓ As datas do CSV serão preservadas.</p>
                )}
                <p className="text-amber-600 mt-1">Os campos abaixo serão aplicados a todos os leads importados.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexo (padrão)</Label>
                <Select 
                  value={importDefaults.gender} 
                  onValueChange={(v) => setImportDefaults(prev => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Nascimento (padrão)</Label>
                <Input
                  type="date"
                  value={importDefaults.birth_date}
                  onChange={(e) => setImportDefaults(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado (padrão)</Label>
                <Select 
                  value={importDefaults.state} 
                  onValueChange={(v) => setImportDefaults(prev => ({ ...prev, state: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cidade (padrão)</Label>
                <Input
                  value={importDefaults.city}
                  onChange={(e) => setImportDefaults(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensagem (padrão)</Label>
              <Textarea
                value={importDefaults.message}
                onChange={(e) => setImportDefaults(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Mensagem padrão para leads importados"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch 
                id="send-kommo-import" 
                checked={sendToKommoAfterImport}
                onCheckedChange={setSendToKommoAfterImport}
              />
              <Label htmlFor="send-kommo-import" className="cursor-pointer font-normal">
                Sugerir envio ao Kommo após importar
              </Label>
            </div>

              <div className="flex flex-col gap-2 mt-4">
                <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importAsOldContacts}
                    onChange={(e) => setImportAsOldContacts(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  Importar como contatos antigos (data de chegada há mais de 1 ano)
                </Label>
              </div>

            {csvData.length > 0 && (
              <div className="space-y-2">
                <Label>Prévia dos leads ({Math.min(5, csvData.length)} de {csvData.length})</Label>
                <div className="max-h-40 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Celular</TableHead>
                        {csvData.some(r => r["Creation Date"]) && <TableHead>Data Criação</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-2">{row.nome}</TableCell>
                          <TableCell className="py-2">{row.celular}</TableCell>
                          {csvData.some(r => r["Creation Date"]) && (
                            <TableCell className="py-2 text-xs">{row["Creation Date"] || "-"}</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvData.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... e mais {csvData.length - 5} leads
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                const headers = ["nome", "celular", "cpf", "email", "gender", "birth_date", "state", "city", "message", "Creation Date", "Modified Date"];
                const exampleRow = ["João da Silva", "61999999999", "123.456.789-00", "joao@email.com", "male", "1990-01-01", "DF", "Brasília", "Gostaria de agendar uma avaliação", "2024-01-01", "2024-01-01"];
                const csvContent = [headers.join(","), exampleRow.join(",")].join("\\n");
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "modelo_importacao_leads.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="mr-auto"
            >
              Baixar Modelo CSV
            </Button>
            <Button variant="ghost" onClick={() => { setImportDialogOpen(false); setCsvData([]); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={csvData.length === 0 || importLeads.isPending}
            >
              {importLeads.isPending ? "Importando..." : `Importar ${csvData.length} leads`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir leads em massa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedLeadIds.size} leads selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={bulkDeleteLeads.isPending}
            >
              {bulkDeleteLeads.isPending ? "Excluindo..." : `Excluir ${selectedLeadIds.size} leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Old Contacts Import Dialog */}
      <Dialog open={oldContactsImportDialogOpen} onOpenChange={setOldContactsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Contatos Antigos
            </DialogTitle>
            <DialogDescription>
              {oldContactsCsvData.length} contatos encontrados no arquivo. As colunas originais serão preservadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted border border-border rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Campos do CSV detectados:</p>
                <p className="text-muted-foreground">
                  celular, nome
                  {oldContactsCsvData.some(r => r["Creation Date"]) && ", Creation Date"}
                  {oldContactsCsvData.some(r => r["Modified Date"]) && ", Modified Date"}
                </p>
                {oldContactsCsvData.some(r => r["Creation Date"] || r["Modified Date"]) && (
                  <p className="text-green-600 dark:text-green-400 mt-1">✓ As datas do CSV serão preservadas.</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importAsOldContacts}
                    onChange={(e) => setImportAsOldContacts(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  Importar como contatos antigos (data de chegada há mais de 1 ano)
                </Label>
              </div>
            </div>

            {oldContactsCsvData.length > 0 && (
              <div className="space-y-2">
                <Label>Prévia dos contatos ({Math.min(5, oldContactsCsvData.length)} de {oldContactsCsvData.length})</Label>
                <div className="max-h-60 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead>Data Criação</TableHead>
                        <TableHead>Data Modificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oldContactsCsvData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-2">{row.nome}</TableCell>
                          <TableCell className="py-2">{row.celular}</TableCell>
                          <TableCell className="py-2 text-xs">{row["Creation Date"] || "-"}</TableCell>
                          <TableCell className="py-2 text-xs">{row["Modified Date"] || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {oldContactsCsvData.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... e mais {oldContactsCsvData.length - 5} contatos
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOldContactsImportDialogOpen(false); setOldContactsCsvData([]); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleOldContactsImport} 
              disabled={oldContactsCsvData.length === 0 || importContacts.isPending}
            >
              {importContacts.isPending ? "Importando..." : `Importar ${oldContactsCsvData.length} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Old Contacts Dialog */}
      <AlertDialog open={bulkDeleteOldContactsDialogOpen} onOpenChange={setBulkDeleteOldContactsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contatos em massa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedOldContactIds.size} contatos selecionados? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeleteOldContacts}
              disabled={bulkDeleteContacts.isPending}
            >
              {bulkDeleteContacts.isPending ? "Excluindo..." : `Excluir ${selectedOldContactIds.size} contatos`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Migrate Old Contacts to Patient Leads Dialog */}
      <Dialog open={migrateDialogOpen} onOpenChange={setMigrateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Migrar para Leads de Pacientes</DialogTitle>
            <DialogDescription>
              Configure os valores padrão para os {selectedOldContactIds.size} contatos que serão migrados.
              Após a migração, os contatos antigos serão removidos automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select 
                  value={migrateDefaults.gender} 
                  onValueChange={(value) => setMigrateDefaults(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={migrateDefaults.birth_date}
                  onChange={(e) => setMigrateDefaults(prev => ({ ...prev, birth_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={migrateDefaults.state} 
                  onValueChange={(value) => setMigrateDefaults(prev => ({ ...prev, state: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={migrateDefaults.city}
                  onChange={(e) => setMigrateDefaults(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Mensagem/Observação</Label>
              <Input
                value={migrateDefaults.message}
                onChange={(e) => setMigrateDefaults(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Mensagem padrão para os leads migrados"
              />
            </div>

            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm text-muted-foreground">
                <strong>Dados preservados:</strong> Nome e celular serão mantidos. 
                A data de criação original será preservada quando disponível.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMigrateContacts}
              disabled={importLeads.isPending || bulkDeleteContacts.isPending}
            >
              {importLeads.isPending || bulkDeleteContacts.isPending 
                ? "Migrando..." 
                : `Migrar ${selectedOldContactIds.size} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientLeads;
