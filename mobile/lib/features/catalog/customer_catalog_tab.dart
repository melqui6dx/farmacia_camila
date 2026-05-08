import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/auth/auth_session_manager.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../cart/data/cart_service.dart';
import 'product_details_page.dart';

class CustomerCatalogTab extends StatefulWidget {
  final int? clienteId;
  final String? accessToken;

  const CustomerCatalogTab({super.key, this.clienteId, this.accessToken});

  @override
  State<CustomerCatalogTab> createState() => _CustomerCatalogTabState();
}

class _CustomerCatalogTabState extends State<CustomerCatalogTab> {
  final ApiClient _apiClient = ApiClient();
  final CartService _cartService = CartService();

  List<dynamic> _categorias = [
    {'id': null, 'nombre': 'Todas las categorías'},
  ];
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _showSuggestions = false;
  List<dynamic> _productosTodos = [];
  List<dynamic> _productosFiltrados = [];
  int? _categoriaSeleccionadaId;
  String _searchQuery = '';
  bool _isLoading = true;
  String _error = '';
  int? _addingProductId;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  String _normalizeBackendUrl(String url) {
    if (url.isEmpty) return url;

    final base = Uri.parse(AppConfig.apiBaseUrl);
    final uri = Uri.parse(url);

    if (!uri.hasScheme) return url;

    // El backend puede devolver next con localhost/127.0.0.1.
    // En Android emulador debe seguir usando AppConfig.apiBaseUrl.
    return uri.replace(scheme: base.scheme, host: base.host, port: base.hasPort ? base.port : null).toString();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final catResponse = await _apiClient.get('/api/inventarios/categorias/');
      if (catResponse.statusCode >= 200 && catResponse.statusCode < 300) {
        final decodedCat = json.decode(utf8.decode(catResponse.bodyBytes));
        final List<dynamic> catData = decodedCat is Map ? (decodedCat['results'] ?? []) : decodedCat;
        _categorias = [
          {'id': null, 'nombre': 'Todas las categorías'},
          ...catData,
        ];
      }

      String? nextUrl = '/api/inventarios/productos/?estado=true';
      final todosLosProductos = <dynamic>[];

      while (nextUrl != null && nextUrl.isNotEmpty) {
        final response = await _apiClient.get(nextUrl);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw Exception('No se pudieron cargar productos. Código ${response.statusCode}');
        }

        final decoded = json.decode(utf8.decode(response.bodyBytes));
        if (decoded is Map) {
          todosLosProductos.addAll(decoded['results'] ?? []);
          final rawNext = decoded['next'];
          nextUrl = rawNext == null ? null : _normalizeBackendUrl(rawNext.toString());
        } else if (decoded is List) {
          todosLosProductos.addAll(decoded);
          nextUrl = null;
        } else {
          nextUrl = null;
        }
      }

      if (!mounted) return;
      setState(() {
        _productosTodos = todosLosProductos;
        _productosFiltrados = List.from(_productosTodos);
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _aplicarFiltros() {
    setState(() {
      _productosFiltrados = _productosTodos.where((p) {
        final bool pasaCategoria = _categoriaSeleccionadaId == null || p['categoria'] == _categoriaSeleccionadaId;
        final String nombreComercial = (p['nombre_comercial'] ?? '').toString().toLowerCase();
        final String nombreGenerico = (p['nombre_generico'] ?? '').toString().toLowerCase();
        final String query = _searchQuery.toLowerCase();
        return pasaCategoria && (query.isEmpty || nombreComercial.contains(query) || nombreGenerico.contains(query));
      }).toList();
    });
  }

  Future<void> _agregarProducto(Map<String, dynamic> producto) async {
    final id = producto['id'];
    if (id is! int) return;

    setState(() => _addingProductId = id);

    try {
      final token = widget.accessToken ?? await AuthSessionManager.getAccessToken();
      await _cartService.agregarItem(
        productoId: id,
        cantidad: 1,
        accessToken: token,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${producto['nombre_comercial'] ?? 'Producto'} añadido al carrito ✅'),
          backgroundColor: const Color(0xFF006A5E),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al agregar: $e'),
          backgroundColor: const Color(0xFFBA1A1A),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _addingProductId = null);
    }
  }


  List<dynamic> get _sugerenciasBusqueda {
    if (_searchQuery.trim().isEmpty) return [];
    return _productosFiltrados.take(3).toList();
  }

  String _categoriaNombreSeleccionada() {
    final categoria = _categorias.firstWhere(
      (cat) => cat['id'] == _categoriaSeleccionadaId,
      orElse: () => {'nombre': 'Todas las categorías'},
    );
    return categoria['nombre']?.toString() ?? 'Todas las categorías';
  }

  void _seleccionarProducto(Map<String, dynamic> producto) {
    _searchFocusNode.unfocus();
    setState(() => _showSuggestions = false);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => ProductDetailsPage(producto: producto)),
    );
  }

  Widget _buildSearchPanel() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD0D7DE)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 165),
                  child: PopupMenuButton<int?>(
                    tooltip: 'Seleccionar categoría',
                    color: Colors.white,
                    elevation: 8,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    onSelected: (value) {
                      setState(() => _categoriaSeleccionadaId = value);
                      _aplicarFiltros();
                    },
                    itemBuilder: (context) => _categorias.map<PopupMenuEntry<int?>>((cat) {
                      final int? id = cat['id'] is int ? cat['id'] as int : null;
                      final bool selected = id == _categoriaSeleccionadaId;
                      return PopupMenuItem<int?>(
                        value: id,
                        child: Row(
                          children: [
                            Icon(
                              selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                              size: 18,
                              color: selected ? const Color(0xFF006A5E) : const Color(0xFF6F7977),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                cat['nombre']?.toString() ?? 'Categoría',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.manrope(
                                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                  color: const Color(0xFF1D2939),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                              _categoriaNombreSeleccionada(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF1D2939),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: Color(0xFF667085)),
                        ],
                      ),
                    ),
                  ),
                ),
                Container(width: 1, height: 50, color: const Color(0xFFE0E3E1)),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    onTap: () => setState(() => _showSuggestions = _searchQuery.trim().isNotEmpty),
                    onChanged: (value) {
                      _searchQuery = value;
                      _aplicarFiltros();
                      setState(() => _showSuggestions = value.trim().isNotEmpty);
                    },
                    style: GoogleFonts.manrope(fontSize: 15.5, fontWeight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: 'Buscar producto...',
                      hintStyle: GoogleFonts.manrope(color: const Color(0xFF667085), fontSize: 15),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
                    ),
                  ),
                ),
                Container(
                  width: 54,
                  height: 54,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    border: Border(left: BorderSide(color: Color(0xFFE0E3E1))),
                    borderRadius: BorderRadius.horizontal(right: Radius.circular(16)),
                  ),
                  child: IconButton(
                    tooltip: 'Buscar',
                    onPressed: () {
                      _searchFocusNode.unfocus();
                      setState(() => _showSuggestions = false);
                    },
                    icon: const Icon(Icons.search_rounded, color: Color(0xFF344054), size: 25),
                  ),
                ),
              ],
            ),
          ),
          if (_showSuggestions) _buildSearchSuggestions(),
        ],
      ),
    );
  }

  Widget _buildSearchSuggestions() {
    final sugerencias = _sugerenciasBusqueda;

    return Container(
      margin: const EdgeInsets.only(top: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE0E3E1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: sugerencias.isEmpty
          ? Padding(
              padding: const EdgeInsets.all(18),
              child: Text(
                'No se encontraron productos para "$_searchQuery"',
                style: GoogleFonts.manrope(color: const Color(0xFF667085), fontWeight: FontWeight.w600),
              ),
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ...sugerencias.map((item) {
                  final producto = item as Map<String, dynamic>;
                  final imageUrl = producto['imagen']?.toString();
                  return InkWell(
                    onTap: () => _seleccionarProducto(producto),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF4F7F6),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFE0E3E1)),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: imageUrl != null && imageUrl.isNotEmpty
                                  ? (imageUrl.toLowerCase().endsWith('.svg')
                                      ? SvgPicture.network(imageUrl, fit: BoxFit.contain)
                                      : Image.network(imageUrl, fit: BoxFit.contain))
                                  : const Icon(Icons.medication_liquid_rounded, color: Color(0xFF9AA8A4)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  producto['nombre_comercial']?.toString() ?? 'Producto',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.manrope(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF1D2939),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  'Bs ${producto['precio_venta']?.toString() ?? '0.00'}',
                                  style: GoogleFonts.manrope(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0077A3),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const Divider(height: 1, color: Color(0xFFE0E3E1)),
                InkWell(
                  onTap: () {
                    _searchFocusNode.unfocus();
                    setState(() => _showSuggestions = false);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    child: Text(
                      'Ver todos los resultados',
                      style: GoogleFonts.manrope(
                        color: const Color(0xFF006A5E),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF006A5E)));
    }

    if (_error.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 56, color: Color(0xFFBA1A1A)),
              const SizedBox(height: 12),
              Text('No se pudo cargar el catálogo', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(_error, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF6F7977))),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchData, child: const Text('Reintentar')),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSearchPanel(),
        const SizedBox(height: 4),
        Expanded(
          child: _productosFiltrados.isEmpty
              ? const Center(child: Text('No se encontraron productos.'))
              : GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 18,
                    crossAxisSpacing: 18,
                    childAspectRatio: 0.60,
                  ),
                  itemCount: _productosFiltrados.length,
                  itemBuilder: (context, index) {
                    final p = _productosFiltrados[index] as Map<String, dynamic>;
                    return _ProductCard(
                      productoRaw: p,
                      brand: p['laboratorio_nombre']?.toString() ?? 'Genérico',
                      name: p['nombre_comercial']?.toString() ?? 'Producto',
                      desc: p['presentacion']?.toString() ?? '',
                      price: p['precio_venta']?.toString() ?? '0.00',
                      imageUrl: p['imagen']?.toString(),
                      stock: int.tryParse(p['inventario']?['stock_disponible']?.toString() ?? '0') ?? 0,
                      isAdding: _addingProductId == p['id'],
                      onAdd: () => _agregarProducto(p),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Map<String, dynamic> productoRaw;
  final String brand, name, desc, price;
  final String? imageUrl;
  final int stock;
  final bool isAdding;
  final VoidCallback onAdd;

  const _ProductCard({
    required this.productoRaw,
    required this.brand,
    required this.name,
    required this.desc,
    required this.price,
    this.imageUrl,
    required this.stock,
    required this.isAdding,
    required this.onAdd,
  });


  @override
  Widget build(BuildContext context) {
    final bool hasStock = stock > 0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE0E3E1)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => ProductDetailsPage(producto: productoRaw)));
              },
              child: Stack(
                children: [
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(15.0),
                      child: imageUrl != null && imageUrl!.isNotEmpty
                          ? (imageUrl!.toLowerCase().endsWith('.svg')
                              ? SvgPicture.network(imageUrl!, fit: BoxFit.contain)
                              : Image.network(imageUrl!, fit: BoxFit.contain))
                          : const Icon(Icons.medication, size: 60, color: Color(0xFFBDC9C5)),
                    ),
                  ),
                  if (!hasStock)
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                      ),
                      child: const Center(
                        child: Text('AGOTADO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Bs $price', style: GoogleFonts.manrope(fontWeight: FontWeight.w800, fontSize: 19, color: const Color(0xFF006A5E))),
                const SizedBox(height: 4),
                Text(brand.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF006A5E), letterSpacing: 0.5)),
                const SizedBox(height: 3),
                Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF191C1C), height: 1.2), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(desc, style: const TextStyle(fontSize: 11, color: Color(0xFF6F7977)), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 42,
                  child: ElevatedButton(
                    onPressed: hasStock && !isAdding ? onAdd : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF006A5E),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: isAdding
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(hasStock ? 'Agregar a carrito' : 'Sin stock', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
