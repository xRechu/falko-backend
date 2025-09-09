import { useState, useEffect } from "react"
import { Button, Container, Heading } from "@medusajs/ui"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"

const FurgonetkaWidget = ({ data: order }: DetailWidgetProps<any>) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [labelData, setLabelData] = useState(order?.metadata?.furgonetka_shipment_id ? {
    id: order.metadata.furgonetka_shipment_id,
    trackingNumber: order.metadata.furgonetka_tracking_number,
    labelUrl: order.metadata.furgonetka_label_url,
    status: order.metadata.furgonetka_status,
    createdAt: order.metadata.furgonetka_created_at
  } : null)

  const generateLabel = async () => {
    setIsGenerating(true)
    try {
      console.log('🚀 Generating Furgonetka label for order:', order.id);
      
      const response = await fetch(`/admin/orders/${order.id}/furgonetka-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errorData = await response.json()
            message = errorData?.error || message
          } else {
            const text = await response.text()
            message = text || message
          }
        } catch (_) {
          // ignore parsing errors
        }
        throw new Error(message)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate label')
      }
      
      console.log('✅ Label generated successfully:', result);
      
      // Map the response to our widget format
      setLabelData({
        id: result.shipment_id,
        trackingNumber: result.tracking_number,
        labelUrl: result.label_url,
        status: result.status,
        createdAt: new Date().toISOString()
      })
      
  alert('Etykieta Furgonetka została wygenerowana pomyślnie!')
    } catch (error: any) {
      console.error('Error generating Furgonetka label:', error)
  alert(`Wystąpił błąd: ${error?.message || 'Nieznany błąd'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadLabel = async () => {
    if (!labelData?.labelUrl) return
    
    // W mock implementacji otwieramy link
    // W prawdziwej implementacji pobieralibyśmy PDF
    window.open(labelData.labelUrl, '_blank')
    
  alert('Link do etykiety został otwarty (mock implementation)')
  }

  const trackShipment = () => {
    if (!labelData?.trackingNumber) return
    
    // Otwórz stronę śledzenia przesyłki
    const trackingUrl = `https://inpost.pl/sledzenie-przesylek?number=${labelData.trackingNumber}`
    window.open(trackingUrl, '_blank')
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📦</span>
          <Heading level="h2">Furgonetka Shipping</Heading>
        </div>
      </div>
      
      <div className="px-6 py-4 space-y-4">
        {!labelData ? (
          <div className="space-y-4">
            <div className="p-4 bg-ui-bg-subtle rounded-lg">
              <p className="text-ui-fg-subtle mb-2">
                <strong>Status:</strong> Etykieta nie została jeszcze wygenerowana
              </p>
              <p className="text-sm text-ui-fg-muted">
                Kliknij przycisk poniżej aby wygenerować etykietę wysyłkową dla tego zamówienia używając Furgonetka API.
              </p>
            </div>
            
            <Button
              onClick={generateLabel}
              disabled={isGenerating}
              variant="secondary"
              className="w-full"
            >
              {isGenerating ? '🔄 Generowanie etykiety...' : '📦 Wygeneruj Etykietę Furgonetka'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-ui-tag-green-bg border border-ui-tag-green-border rounded-lg">
              <p className="text-ui-tag-green-text font-medium mb-2">
                ✅ Etykieta wygenerowana pomyślnie
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Numer przesyłki:</strong><br/>
                  <code className="bg-ui-bg-subtle px-2 py-1 rounded text-sm">
                    {labelData.trackingNumber}
                  </code>
                </p>
                <p className="text-sm">
                  <strong>Status:</strong> 
                  <span className="ml-2 px-2 py-1 bg-ui-tag-blue-bg text-ui-tag-blue-text rounded text-xs">
                    {labelData.status}
                  </span>
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>ID Furgonetka:</strong><br/>
                  <code className="bg-ui-bg-subtle px-2 py-1 rounded text-sm">
                    {labelData.id}
                  </code>
                </p>
                <p className="text-sm">
                  <strong>Utworzono:</strong><br/>
                  <span className="text-ui-fg-subtle">
                    {new Date(labelData.createdAt).toLocaleString('pl-PL')}
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadLabel} variant="secondary" size="small">
                📄 Pobierz Etykietę PDF
              </Button>
              <Button onClick={trackShipment} variant="secondary" size="small">
                🔍 Śledź Przesyłkę
              </Button>
              <Button 
                onClick={() => setLabelData(null)} 
                variant="danger" 
                size="small"
              >
                🔄 Wygeneruj Ponownie
              </Button>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

// Widget configuration
export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default FurgonetkaWidget
