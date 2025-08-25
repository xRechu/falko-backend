/*
 * Copyright 2025 Falko Team
 *
 * MIT License
 */

import { useState } from "react"
import type { OrderDetailsWidgetProps, WidgetConfig } from "@medusajs/admin"
import { Container, Heading, Button, Alert, toast } from "@medusajs/ui"

const FurgonetkaWidget = ({ order }: OrderDetailsWidgetProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [labelData, setLabelData] = useState(null);

  const generateLabel = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/admin/fulfillments/furgonetka/shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderData: order })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setLabelData(result);
      
      toast.success("Sukces", {
        description: 'Etykieta została wygenerowana pomyślnie!',
      });
    } catch (error) {
      console.error('Error generating label:', error);
      toast.error("Błąd", {
        description: 'Wystąpił błąd podczas generowania etykiety',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLabel = async () => {
    if (!labelData?.labelUrl) return;
    
    try {
      const response = await fetch(labelData.labelUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etykieta-${order.display_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Błąd", {
        description: 'Nie można pobrać etykiety',
      });
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">📦 Furgonetka Shipping</Heading>
      </div>
      
      <div className="px-6 py-4">
        {!labelData ? (
          <div className="space-y-4">
            <p className="text-ui-fg-subtle">
              Wygeneruj etykietę wysyłkową dla tego zamówienia używając Furgonetka API.
            </p>
            <Button
              onClick={generateLabel}
              disabled={isGenerating}
              variant="secondary"
            >
              {isGenerating ? 'Generowanie...' : 'Wygeneruj Etykietę'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="success">
              Etykieta została wygenerowana pomyślnie!
            </Alert>
            
            <div className="space-y-2">
              <p><strong>Numer przesyłki:</strong> {labelData.trackingNumber}</p>
              <p><strong>Status:</strong> {labelData.status}</p>
              <p><strong>ID Furgonetka:</strong> {labelData.id}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={downloadLabel} variant="secondary">
                Pobierz Etykietę PDF
              </Button>
              <Button onClick={() => setLabelData(null)} variant="danger">
                Wygeneruj Ponownie
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}

export const config: WidgetConfig = {
  zone: "order.details.after",
}

export default FurgonetkaWidget
