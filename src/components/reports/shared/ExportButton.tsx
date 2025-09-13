import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Image, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  title?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  title,
  className = "",
  variant = "outline",
  size = "sm"
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCsv = () => {
    if (!data.length) {
      toast({
        title: "Export Error",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.map(escapeCsvField).join(","),
        ...data.map(row => 
          headers.map(header => escapeCsvField(row[header])).join(",")
        )
      ].join("\n");

      // Add UTF-8 BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `CSV file "${filename}.csv" has been downloaded`,
      });
    } catch (error) {
      console.error("CSV export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file",
        variant: "destructive",
      });
    }
  };

  const exportToPdf = async () => {
    if (!data.length) {
      toast({
        title: "Export Error",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      
      // Add title and metadata
      if (title) {
        pdf.setFontSize(16);
        pdf.text(title, 14, 22);
        pdf.setFontSize(10);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
        pdf.text(`Total Records: ${data.length}`, 14, 40);
      }

      const headers = Object.keys(data[0]);
      const tableData = data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          return String(value);
        })
      );

      // Use autoTable for proper table formatting
      autoTable(pdf, {
        head: [headers],
        body: tableData,
        startY: title ? 50 : 20,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
        },
        margin: { top: 20, right: 14, bottom: 20, left: 14 },
        tableWidth: 'auto',
        theme: 'striped',
      });

      pdf.save(`${filename}.pdf`);
      
      toast({
        title: "Export Successful",
        description: `PDF file "${filename}.pdf" has been downloaded`,
      });
    } catch (error) {
      console.error("Export to PDF failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToImage = async () => {
    setIsExporting(true);
    try {
      const element = document.querySelector('[data-export-target]');
      if (!element) {
        toast({
          title: "Export Error",
          description: "No content found to export as image",
          variant: "destructive",
        });
        return;
      }

      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });
      
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Image file "${filename}.png" has been downloaded`,
      });
    } catch (error) {
      console.error("Export to image failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export image file",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isExporting || !data.length}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCsv}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPdf}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToImage}>
          <Image className="h-4 w-4 mr-2" />
          Export as Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};