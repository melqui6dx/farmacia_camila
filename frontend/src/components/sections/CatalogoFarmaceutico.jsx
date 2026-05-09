import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getApiBaseUrl } from "../../services/apiClient";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import { CartIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, SearchIcon } from "../ui/Icons";
import { categoriasService, productosService, subcategoriasService } from "../../services/inventarioService";
import { carritoService } from "../../services/carritoService";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";

function Badge({ label, tone }) {
  const map = {
    stock: "bg-teal-700 text-white",
    rx: "bg-rose-600 text-white",
    neutral: "bg-slate-200 text-slate-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${map[tone] || map.neutral}`}>{label}</span>;
}

function AuthModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
            <svg className="h-8 w-8 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900">Autenticación requerida</h3>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Si usted ya es cliente puede autenticarse en el login, si no lo es puede usted registrarse.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-12 flex-1 border-slate-300 text-base font-bold hover:bg-slate-50"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            className="h-12 flex-1 bg-teal-700 text-base font-bold hover:bg-teal-600"
            onClick={onAccept}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductVisual({ index }) {
  const tones = ["from-slate-100 to-sky-100", "from-slate-100 to-cyan-100", "from-slate-100 to-emerald-100", "from-slate-100 to-sky-200"];

  return (
    <div className={`relative h-24 w-full overflow-hidden rounded-xl bg-gradient-to-br ${tones[index % tones.length]}`}>
      <div className="absolute inset-x-4 bottom-3 h-3 rounded-full bg-slate-900/10 blur-sm" />
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white/90 shadow" />
    </div>
  );
}

async function fetchAllPaginated(serviceListFn, initialParams = {}) {
  let page = 1;
  let hasNext = true;
  const items = [];

  while (hasNext) {
    const response = await serviceListFn({ ...initialParams, page });
    const pageItems = response?.results || [];
    items.push(...pageItems);
    hasNext = Boolean(response?.next);
    page += 1;
  }

  return items;
}

export default function CatalogoFarmaceutico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [subcategoriaActiva, setSubcategoriaActiva] = useState(null);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState("");
  const [loadingBusqueda, setLoadingBusqueda] = useState(true);
  const [filtroCategoriaBusqueda, setFiltroCategoriaBusqueda] = useState("all");
  const [queryBusqueda, setQueryBusqueda] = useState("");
  const [showBusquedaPanel, setShowBusquedaPanel] = useState(false);
  const [mostrarResultadosBusqueda, setMostrarResultadosBusqueda] = useState(false);
  const [detalleProducto, setDetalleProducto] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [showCartPanel, setShowCartPanel] = useState(false);
  const [categoriaPaginaActiva, setCategoriaPaginaActiva] = useState(0);
  const [productoPaginaActiva, setProductoPaginaActiva] = useState(0);
  const [categoriasViewportWidth, setCategoriasViewportWidth] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const categoriasViewportRef = useRef(null);
  const busquedaRef = useRef(null);
  const detalleModalRef = useRef(null);
  useOutsideClick(busquedaRef, () => setShowBusquedaPanel(false));
  useOutsideClick(detalleModalRef, () => {
    if (detalleProducto) setDetalleProducto(null);
  });

  useEffect(() => {
    let mounted = true;

    const cargarTabs = async () => {
      setLoadingTabs(true);
      try {
        const [catsPage, subsPage] = await Promise.all([
          fetchAllPaginated(categoriasService.listar, { estado: true }),
          fetchAllPaginated(subcategoriasService.listar, {}),
        ]);

        if (!mounted) return;

        setCategorias(catsPage);
        setSubcategorias(subsPage);

        if (catsPage.length > 0) {
          setCategoriaActiva(catsPage[0].id);
        }
      } catch {
        if (!mounted) return;
        setCategorias([]);
        setSubcategorias([]);
      } finally {
        if (mounted) setLoadingTabs(false);
      }
    };

    cargarTabs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const cargarProductos = async () => {
      setLoadingProductos(true);
      setErrorProductos("");
      try {
        const params = { estado: true };
        if (categoriaActiva) params.categoria = categoriaActiva;
        if (subcategoriaActiva) params.subcategoria = subcategoriaActiva;
        const items = await fetchAllPaginated(productosService.listar, params);
        if (!mounted) return;
        setProductos(items);
      } catch {
        if (!mounted) return;
        setProductos([]);
        setErrorProductos("No se pudieron cargar los productos.");
      } finally {
        if (mounted) {
          setLoadingProductos(false);
          setLoadingBusqueda(false);
        }
      }
    };

    cargarProductos();
    return () => {
      mounted = false;
    };
  }, [categoriaActiva, subcategoriaActiva]);



  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setDetalleProducto(null);
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, []);

  const subcategoriasFiltradas = useMemo(() => {
    if (!categoriaActiva) return [];
    return subcategorias.filter((sub) => Number(sub.categoria) === Number(categoriaActiva));
  }, [subcategorias, categoriaActiva]);

  useEffect(() => {
    const el = categoriasViewportRef.current;
    if (!el) return;

    const updateWidth = () => {
      setCategoriasViewportWidth(el.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  const categoriasPaginadas = useMemo(() => {
    if (!categorias.length) return [];
    const gap = 8;
    const availableWidth = categoriasViewportWidth > 0 ? categoriasViewportWidth : 1112;
    const measureCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
    if (measureCtx) {
      measureCtx.font = "700 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    }
    const estimateWidth = (nombre) => {
      if (!measureCtx) return nombre.length * 6.5 + 30;
      const textWidth = measureCtx.measureText(nombre || "").width;
      return Math.ceil(textWidth + 26);
    };

    const pages = [];
    let current = [];
    let currentWidth = 0;

    for (const cat of categorias) {
      const itemWidth = estimateWidth(cat.nombre);
      const nextWidth = current.length === 0 ? itemWidth : currentWidth + gap + itemWidth;
      const exceeds = nextWidth > availableWidth;

      if (exceeds) {
        pages.push(current);
        current = [cat];
        currentWidth = itemWidth;
      } else {
        current.push(cat);
        currentWidth = nextWidth;
      }
    }

    if (current.length) pages.push(current);
    return pages;
  }, [categorias, categoriasViewportWidth]);

  useEffect(() => {
    if (categoriaPaginaActiva > categoriasPaginadas.length - 1) {
      setCategoriaPaginaActiva(0);
    }
  }, [categoriasPaginadas, categoriaPaginaActiva]);

  const paginaCategoriasActual = categoriasPaginadas[categoriaPaginaActiva] || [];

  const normalizarImagen = (url) => {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    const base = getApiBaseUrl().replace(/\/$/, "");
    const path = `${url}`.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  };

  const formatPrecio = (valor) => {
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "Bs --";
    return new Intl.NumberFormat("es-BO", {
      style: "currency",
      currency: "BOB",
      minimumFractionDigits: 2,
    }).format(numero);
  };

  const resultadosBusquedaTodos = useMemo(() => {
    const q = queryBusqueda.trim().toLowerCase();
    return productos.filter((item) => {
      const cumpleCategoria = filtroCategoriaBusqueda === "all" || Number(item.categoria) === Number(filtroCategoriaBusqueda);
      if (!cumpleCategoria) return false;
      if (!q) return true;
      const texto = [
        item.nombre_comercial,
        item.nombre_generico,
        item.sku,
        item.categoria_nombre,
        item.laboratorio_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return texto.includes(q);
    });
  }, [productos, filtroCategoriaBusqueda, queryBusqueda]);

  const resultadosBusqueda = useMemo(() => {
    const q = queryBusqueda.trim();
    if (!q) return [];
    return resultadosBusquedaTodos.slice(0, 6);
  }, [resultadosBusquedaTodos, queryBusqueda]);

  const productosBase = mostrarResultadosBusqueda ? resultadosBusquedaTodos : productos;

  const productosPaginados = useMemo(() => {
    const pageSize = 6;
    const pages = [];
    for (let i = 0; i < productosBase.length; i += pageSize) {
      pages.push(productosBase.slice(i, i + pageSize));
    }
    return pages;
  }, [productosBase]);

  useEffect(() => {
    setProductoPaginaActiva(0);
  }, [categoriaActiva, subcategoriaActiva]);

  useEffect(() => {
    if (productoPaginaActiva > productosPaginados.length - 1) {
      setProductoPaginaActiva(0);
    }
  }, [productosPaginados, productoPaginaActiva]);

  const paginaProductosActual = productosPaginados[productoPaginaActiva] || [];
  const closeDetalleProducto = () => setDetalleProducto(null);
  const subtotalCarrito = useMemo(
    () => cartItems.reduce((acc, item) => acc + Number(item.precio_venta || 0) * Number(item.cantidad || 0), 0),
    [cartItems]
  );
  const impuestoCarrito = useMemo(() => subtotalCarrito * 0.0825, [subtotalCarrito]);
  const totalCarrito = useMemo(() => subtotalCarrito + impuestoCarrito, [subtotalCarrito, impuestoCarrito]);

  const agregarAlCarrito = async (producto, cantidad = 1) => {
    try {
      await carritoService.agregar({
        producto_id: producto.id,
        cantidad,
      });
    } catch (error) {
      console.error("Error al agregar al carrito en el backend:", error);
    }

    setCartItems((prev) => {
      const index = prev.findIndex((item) => Number(item.id) == Number(producto.id));
      if (index >= 0) {
        return prev.map((item, idx) => (idx === index ? { ...item, cantidad: item.cantidad + cantidad } : item));
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre_comercial: producto.nombre_comercial,
          precio_venta: Number(producto.precio_venta || 0),
          imagen: producto.imagen || "",
          cantidad,
        },
      ];
    });
  };

  const actualizarCantidadCarrito = (productoId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (Number(item.id) !== Number(productoId)) return item;
          return { ...item, cantidad: item.cantidad + delta };
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const eliminarItemCarrito = (productoId) => {
    setCartItems((prev) => prev.filter((item) => Number(item.id) !== Number(productoId)));
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleAuthModalAccept = () => {
    setShowAuthModal(false);
    navigate("/login");
  };

  const cargarCarritoDesdeBackend = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await carritoService.listar();
      if (data && data.items) {
        const items = data.items.map((item) => ({
          id: item.producto,
          nombre_comercial: item.producto_nombre || item.producto,
          precio_venta: item.precio_unitario,
          imagen: "",
          cantidad: item.cantidad,
        }));
        setCartItems(items);
      }
    } catch (error) {
      console.error("Error al cargar carrito desde backend:", error);
    }
  }, [user]);

  useEffect(() => {
    cargarCarritoDesdeBackend();
  }, [cargarCarritoDesdeBackend]);

  // Función para sincronizar carrito y navegar a checkout
  const handleGoToCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setIsSyncing(true);
    console.log("Sincronizando carrito con backend...");
    
    try {
      // Sincronizar cada producto del carrito local con el backend
      for (const item of cartItems) {
        await carritoService.agregar({
          producto_id: item.id,
          cantidad: item.cantidad,
        });
      }
      
      // Obtener el carrito actualizado con el token
      const carritoData = await carritoService.listar();
      const token = carritoData.invitado_token || carritoService.getToken();
      
      console.log("Carrito sincronizado. Token:", token);
      
      // Navegar a checkout con los datos y el token
      navigate("/checkout", {
        state: {
          items: cartItems,
          subtotal: subtotalCarrito,
          impuesto: impuestoCarrito,
          total: totalCarrito,
          carrito_token: token,
        },
      });
    } catch (error) {
      console.error("Error al sincronizar carrito:", error);
      // Si falla, igual navegar pero sin token (mostrará error)
      navigate("/checkout", {
        state: {
          items: cartItems,
          subtotal: subtotalCarrito,
          impuesto: impuestoCarrito,
          total: totalCarrito,
        },
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-sky-100 bg-white/97 p-5 shadow-2xl shadow-slate-200/60 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-3xl font-black tracking-tight text-slate-900">Catalogo de productos</h3>
          <p className="text-sm font-semibold text-slate-500">Categorias y subcategorias</p>
        </div>
        <div ref={busquedaRef} className="relative w-full max-w-[740px]">
          <div className="flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="relative min-w-[180px] rounded-l-xl border-r border-slate-200 bg-slate-50">
              <select
                value={filtroCategoriaBusqueda}
                onChange={(e) => setFiltroCategoriaBusqueda(e.target.value)}
                className="h-full w-full appearance-none bg-transparent px-4 pr-9 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">Todas las categorias</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <input
              type="text"
              value={queryBusqueda}
              onChange={(e) => setQueryBusqueda(e.target.value)}
              onFocus={() => setShowBusquedaPanel(true)}
              placeholder="Buscar productos..."
              className="w-full px-4 text-sm text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowBusquedaPanel((prev) => !prev)}
              className="inline-flex w-14 items-center justify-center border-l border-slate-200 bg-slate-50 text-slate-700"
              aria-label="Buscar"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>

          {showBusquedaPanel && (
            <div className="absolute left-0 right-0 top-[52px] z-20 rounded-md border border-slate-300 bg-white shadow-xl">
              <div className="max-h-[360px] overflow-y-auto p-3">
                {loadingBusqueda ? (
                  <p className="text-sm font-medium text-slate-500">Buscando productos...</p>
                ) : queryBusqueda.trim() === "" ? (
                  <p className="text-sm font-medium text-slate-500">Escribe para buscar productos.</p>
                ) : resultadosBusqueda.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No hay resultados.</p>
                ) : (
                  <div className="space-y-2">
                    {resultadosBusqueda.map((item) => {
                      const img = normalizarImagen(item.imagen);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setMostrarResultadosBusqueda(false);
                            setCategoriaActiva(item.categoria);
                            setSubcategoriaActiva(item.subcategoria || null);
                            setQueryBusqueda(item.nombre_comercial || "");
                            setShowBusquedaPanel(false);
                          }}
                          className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                        >
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                            {img ? (
                              <img src={img} alt={item.nombre_comercial} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-slate-800">{item.nombre_comercial}</p>
                            <p className="text-sm font-bold text-sky-700">{formatPrecio(item.precio_venta)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {queryBusqueda.trim() !== "" && (
                <div className="border-t border-slate-200 px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarResultadosBusqueda(true);
                      setCategoriaActiva(null);
                      setSubcategoriaActiva(null);
                      setCategoriaPaginaActiva(0);
                      setProductoPaginaActiva(0);
                      setShowBusquedaPanel(false);
                    }}
                    className="text-sm font-semibold text-sky-700 hover:text-sky-800"
                  >
                    Ver todos los resultados
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setCategoriaPaginaActiva((prev) => Math.max(0, prev - 1))}
          disabled={categoriaPaginaActiva === 0}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 hover:border-sky-300"
          aria-label="Desplazar categorias a la izquierda"
        >
          {"<"}
        </button>
        <div
          ref={categoriasViewportRef}
          className="w-full max-w-[1112px] overflow-hidden"
        >
          <div className="flex flex-nowrap gap-2 pb-1">
            {loadingTabs ? (
              <span className="whitespace-nowrap text-xs font-semibold text-slate-500">Cargando categorias...</span>
            ) : categorias.length === 0 ? (
              <span className="whitespace-nowrap text-xs font-semibold text-rose-600">No hay categorias disponibles</span>
            ) : (
              paginaCategoriasActual.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setMostrarResultadosBusqueda(false);
                    setCategoriaActiva(cat.id);
                    setSubcategoriaActiva(null);
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold ${Number(categoriaActiva) === Number(cat.id) ? "border-sky-900 bg-sky-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}
                >
                  {cat.nombre}
                </button>
              ))
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCategoriaPaginaActiva((prev) => Math.min(categoriasPaginadas.length - 1, prev + 1))}
          disabled={categoriaPaginaActiva >= categoriasPaginadas.length - 1}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 hover:border-sky-300"
          aria-label="Desplazar categorias a la derecha"
        >
          {">"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {subcategoriasFiltradas.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => {
              setMostrarResultadosBusqueda(false);
              setSubcategoriaActiva(sub.id);
            }}
            className={`rounded-lg border px-3 py-1 text-[11px] font-bold ${Number(subcategoriaActiva) === Number(sub.id) ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"}`}
          >
            {sub.nombre}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowCartPanel((prev) => !prev)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-teal-600 bg-teal-700 px-2.5 text-white hover:bg-teal-600"
            aria-label="Mostrar u ocultar carrito"
            title={showCartPanel ? "Ocultar carrito" : "Ver carrito"}
          >
            <CartIcon className="h-4 w-4" />
            {showCartPanel ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        <div className={`grid gap-4 ${showCartPanel ? "xl:grid-cols-[minmax(0,1fr)_330px]" : "grid-cols-1"}`}>
        <div>
          {loadingProductos ? (
            <p className="text-sm font-semibold text-slate-500">Cargando productos...</p>
          ) : errorProductos ? (
            <p className="text-sm font-semibold text-rose-600">{errorProductos}</p>
          ) : productosBase.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No hay productos para esta seleccion.</p>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setProductoPaginaActiva((prev) => Math.max(0, prev - 1))}
                disabled={productoPaginaActiva === 0}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 hover:border-sky-300"
                aria-label="Desplazar productos a la izquierda"
              >
                {"<"}
              </button>
              <div className="w-full max-w-[864px] overflow-hidden">
                <div className="grid grid-cols-3 grid-rows-2 gap-3">
                  {paginaProductosActual.map((producto, index) => {
                    const stockActual = Number(producto?.inventario?.stock_actual ?? 0);
                    const stockMinimo = Number(producto?.inventario?.stock_minimo ?? producto?.stock_minimo ?? 0);
                    const badgeInfo = stockActual <= 0
                      ? { label: "Sin stock", tone: "rx" }
                      : stockActual <= stockMinimo
                        ? { label: "Stock bajo", tone: "neutral" }
                        : { label: "Disponible", tone: "stock" };
                    const imagenSrc = normalizarImagen(producto.imagen);
                    const detalle = [producto.nombre_generico || "", producto.concentracion || "", producto.presentacion || ""]
                      .filter(Boolean)
                      .join(" - ");

                    return (
                      <article key={producto.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="mb-3 space-y-2">
                          <div className="flex justify-end">
                            <Badge label={badgeInfo.label} tone={badgeInfo.tone} />
                          </div>
                          {imagenSrc ? (
                            <div className="h-24 w-full overflow-hidden rounded-xl border border-slate-100 bg-white">
                              <img src={imagenSrc} alt={producto.nombre_comercial} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          ) : (
                            <ProductVisual index={index} />
                          )}
                        </div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-sky-700">{producto.categoria_nombre}</p>
                        <h4 className="mt-1 leading-none text-lg font-black text-slate-900">{producto.nombre_comercial}</h4>
                        <p className="mt-1 text-xs font-medium text-slate-500">{detalle || "Sin descripcion adicional."}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">Stock: {stockActual} | Lab: {producto.laboratorio_nombre || "-"}</p>
                        <div className="mt-3 flex items-end justify-between gap-2">
                          <span className="text-2xl font-black text-sky-950">{formatPrecio(producto.precio_venta)}</span>
                          <Button size="sm" onClick={() => setDetalleProducto(producto)} className="h-9 bg-sky-900 px-3 text-xs hover:bg-sky-800">Ver detalle</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductoPaginaActiva((prev) => Math.min(productosPaginados.length - 1, prev + 1))}
                disabled={productoPaginaActiva >= productosPaginados.length - 1}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-600 hover:border-sky-300"
                aria-label="Desplazar productos a la derecha"
              >
                {">"}
              </button>
            </div>
          )}
        </div>

        {showCartPanel && (
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-3">
            <p className="text-lg font-black text-slate-900">Transaccion actual</p>
            <p className="text-[11px] font-semibold text-slate-500">Carrito de compras</p>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto p-3">
            {cartItems.length === 0 ? (
              <p className="text-sm font-semibold text-slate-500">No hay productos en el carrito.</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-bold text-slate-800">{item.nombre_comercial}</p>
                    <span className="text-sm font-black text-slate-900">{formatPrecio(item.precio_venta)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
                      <button type="button" onClick={() => actualizarCantidadCarrito(item.id, -1)} className="px-2 py-0.5 text-sm font-black text-slate-700">-</button>
                      <span className="px-2 text-xs font-bold text-slate-700">{item.cantidad}</span>
                      <button type="button" onClick={() => actualizarCantidadCarrito(item.id, 1)} className="px-2 py-0.5 text-sm font-black text-slate-700">+</button>
                    </div>
                    <button type="button" onClick={() => eliminarItemCarrito(item.id)} className="text-xs font-bold text-rose-600 hover:text-rose-700">Quitar</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-1 border-t border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between font-medium text-slate-600">
              <span>Subtotal</span>
              <span>{formatPrecio(subtotalCarrito)}</span>
            </div>
            <div className="flex items-center justify-between font-medium text-slate-600">
              <span>Impuesto (8.25%)</span>
              <span>{formatPrecio(impuestoCarrito)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-lg font-black text-slate-900">
              <span>Total</span>
              <span>{formatPrecio(totalCarrito)}</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Pago en linea disponible solo con tarjeta de credito.
            </p>
            <Button
              className="mt-2 h-11 w-full gap-1 bg-teal-700 text-base font-black hover:bg-teal-600 disabled:opacity-50"
              onClick={handleGoToCheckout}
              disabled={isSyncing || cartItems.length === 0}
            >
              {isSyncing ? "Sincronizando..." : "Completar venta"}
              <CartIcon className="h-4 w-4" />
            </Button>
          </div>
          </aside>
        )}
        </div>
      </div>

      {detalleProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div ref={detalleModalRef} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">
                Inventario &gt; {detalleProducto.categoria_nombre} &gt; <span className="text-slate-800">{detalleProducto.nombre_comercial}</span>
              </p>
              <button
                type="button"
                onClick={closeDetalleProducto}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="overflow-hidden rounded-lg bg-gradient-to-br from-cyan-100 to-sky-200 p-6">
                  {normalizarImagen(detalleProducto.imagen) ? (
                    <img
                      src={normalizarImagen(detalleProducto.imagen)}
                      alt={detalleProducto.nombre_comercial}
                      className="mx-auto h-[260px] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="mx-auto h-[260px] max-w-[300px]">
                      <ProductVisual index={0} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h4 className="text-3xl font-black leading-none text-slate-900">{detalleProducto.nombre_comercial}</h4>
                    <span className="rounded-full bg-teal-100 px-2 py-1 text-[10px] font-extrabold uppercase text-teal-800">
                      {Number(detalleProducto?.inventario?.stock_actual ?? 0) > 0 ? "En stock" : "Sin stock"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">
                    {detalleProducto.concentracion || "-"} | {detalleProducto.presentacion || "-"}
                  </p>
                  <div className="mt-2 flex items-end gap-3">
                    <span className="text-5xl font-black leading-none text-sky-950">{formatPrecio(detalleProducto.precio_venta)}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      className="h-12 w-full bg-teal-700 text-base font-extrabold hover:bg-teal-600"
                      onClick={() => {
                        if (!user) {
                          setShowAuthModal(true);
                        } else {
                          agregarAlCarrito(detalleProducto);
                          setShowCartPanel(true);
                        }
                      }}
                    >
                      Agregar al carrito
                    </Button>
                    <Button variant="outline" className="h-12 w-full border-slate-300 text-base font-extrabold" 
                    onClick={async () => {
                      if (!user) {
                        setShowAuthModal(true);
                      } else {
                        await agregarAlCarrito(detalleProducto);
                        navigate("/checkout", {
                          state: {
                            items: cartItems,
                            subtotal: subtotalCarrito,
                            impuesto: impuestoCarrito,
                            total: totalCarrito,
                          },
                        });
                      }
                    }}>
                Comprar ahora</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Disponibilidad</p>
                    <p className="text-sm font-bold text-teal-700">{Number(detalleProducto?.inventario?.stock_actual ?? 0) > 0 ? "Solo en linea" : "Sin stock"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Requiere receta</p>
                    <p className="text-sm font-bold text-slate-700">{detalleProducto.requiere_receta ? "Si" : "No"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <h5 className="text-2xl font-black leading-none text-slate-900">Descripción del producto</h5>
                <p className="mt-2 text-sm font-medium text-slate-600">{detalleProducto.descripcion || "Sin descripción registrada."}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h5 className="text-2xl font-black leading-none text-slate-900">Ingredientes activos</h5>
                <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                  <p>{detalleProducto.nombre_generico || "No especificado"}</p>
                  <p>{detalleProducto.forma_farmaceutica || "-"}</p>
                  <p>{detalleProducto.unidad_medida || "-"}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <h5 className="text-2xl font-black leading-none text-slate-900">Uso y dosificación</h5>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {detalleProducto.descripcion || "Consultar al profesional de salud para dosis recomendada segun paciente."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onAccept={handleAuthModalAccept}
      />
    </section>
  );
}