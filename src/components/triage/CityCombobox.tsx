import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchMunicipalities } from "@/lib/brazil";

type Props = {
  uf?: string;
  value?: string;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

/** Dynamic city selector. Loads municipalities for the selected UF from IBGE. */
export function CityCombobox({ uf, value, onChange, className, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uf) {
      setCities([]);
      return;
    }
    setLoading(true);
    fetchMunicipalities(uf).then((list) => {
      if (active) {
        setCities(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [uf]);

  const isDisabled = disabled || !uf;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={isDisabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {value || (uf ? (placeholder ?? "Selecione a cidade...") : "Selecione a UF primeiro")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 pointer-events-auto" align="start">
        <Command>
          <CommandInput placeholder="Buscar cidade..." />
          <CommandList>
            <CommandEmpty>{loading ? "Carregando..." : "Nenhuma cidade encontrada."}</CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === city ? "opacity-100" : "opacity-0")} />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
