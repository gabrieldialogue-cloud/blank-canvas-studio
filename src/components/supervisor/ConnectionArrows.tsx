import { useEffect, useState, useCallback } from "react";

interface ConnectionArrowsProps {
  selectedMarca: string | null;
  selectedVendedor: { id: string } | null;
  selectedCliente: { id: string } | null;
}

interface ArrowData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ConnectionArrows({ selectedMarca, selectedVendedor, selectedCliente }: ConnectionArrowsProps) {
  const [marcaToVendedor, setMarcaToVendedor] = useState<ArrowData | null>(null);
  const [vendedorToCliente, setVendedorToCliente] = useState<ArrowData | null>(null);

  const calculatePositions = useCallback(() => {
    // Seta Marca → Vendedor
    if (selectedMarca && selectedVendedor) {
      const marcaElement = document.querySelector(`[data-marca="${selectedMarca}"]`);
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);

      if (marcaElement && vendedorElement) {
        const marcaRect = marcaElement.getBoundingClientRect();
        const vendedorRect = vendedorElement.getBoundingClientRect();

        setMarcaToVendedor({
          startX: marcaRect.right,
          startY: marcaRect.top + marcaRect.height / 2,
          endX: vendedorRect.left,
          endY: vendedorRect.top + vendedorRect.height / 2,
        });
      }
    } else {
      setMarcaToVendedor(null);
    }

    // Seta Vendedor → Cliente
    if (selectedVendedor && selectedCliente) {
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);
      const clienteElement = document.querySelector(`[data-cliente-id="${selectedCliente.id}"]`);

      if (vendedorElement && clienteElement) {
        const vendedorRect = vendedorElement.getBoundingClientRect();
        const clienteRect = clienteElement.getBoundingClientRect();

        setVendedorToCliente({
          startX: vendedorRect.right,
          startY: vendedorRect.top + vendedorRect.height / 2,
          endX: clienteRect.left,
          endY: clienteRect.top + clienteRect.height / 2,
        });
      }
    } else {
      setVendedorToCliente(null);
    }
  }, [selectedMarca, selectedVendedor, selectedCliente]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePositions();
    }, 300);

    const handleUpdate = () => {
      calculatePositions();
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [calculatePositions]);

  const renderCurvedArrow = (data: ArrowData, key: string) => {
    const width = data.endX - data.startX;
    
    // Pontos de controle para curva suave (curvatura pequena)
    const controlX1 = data.startX + width * 0.3;
    const controlY1 = data.startY;
    const controlX2 = data.endX - width * 0.3;
    const controlY2 = data.endY;
    
    const path = `M ${data.startX} ${data.startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${data.endX} ${data.endY}`;

    return (
      <svg
        key={key}
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh', zIndex: 10 }}
      >
        <defs>
          {/* Cabeça da seta menor */}
          <marker
            id={`arrow-${key}`}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L0,6 L6,3 z"
              className="fill-primary"
            />
          </marker>
        </defs>

        {/* Linha principal */}
        <path
          d={path}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd={`url(#arrow-${key})`}
        />
      </svg>
    );
  };

  if (!marcaToVendedor && !vendedorToCliente) return null;

  return (
    <>
      {marcaToVendedor && renderCurvedArrow(marcaToVendedor, 'marca-vendedor')}
      {vendedorToCliente && renderCurvedArrow(vendedorToCliente, 'vendedor-cliente')}
    </>
  );
}
