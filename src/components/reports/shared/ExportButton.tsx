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
import html2canvas from "html2canvas";

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

  const exportToCsv = () => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportToPdf = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF();
      
      // Add title
      if (title) {
        pdf.setFontSize(16);
        pdf.text(title, 20, 20);
        pdf.setFontSize(10);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      }

      // Add data as text (simplified)
      let yPos = title ? 50 : 20;
      const pageHeight = pdf.internal.pageSize.height;
      
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        
        // Headers
        pdf.setFontSize(8);
        let xPos = 20;
        headers.forEach((header, index) => {
          pdf.text(header, xPos, yPos);
          xPos += 30;
        });
        
        yPos += 10;
        
        // Data rows
        data.forEach((row) => {
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
          }
          
          xPos = 20;
          headers.forEach((header) => {
            const value = row[header]?.toString() || "";
            pdf.text(value.substring(0, 15), xPos, yPos);
            xPos += 30;
          });
          yPos += 8;
        });
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error("Export to PDF failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToImage = async () => {
    setIsExporting(true);
    try {
      const element = document.querySelector('[data-export-target]');
      if (element) {
        const canvas = await html2canvas(element as HTMLElement);
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (error) {
      console.error("Export to image failed:", error);
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