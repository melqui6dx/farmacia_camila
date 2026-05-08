import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/auth/auth_session_manager.dart';
import 'data/cart_service.dart';

class CartTab extends StatefulWidget {
  const CartTab({super.key});

  @override
  State<CartTab> createState() => _CartTabState();
}

class _CartTabState extends State<CartTab> {
  final CartService _cartService = CartService();

  List<Map<String, dynamic>> _cartItems = [];
  bool _loading = true;
  bool _processing = false;
  String _error = '';
  double _subtotal = 0;
  double _total = 0;

  @override
  void initState() {
    super.initState();
    _loadCartItems();
  }

  Future<String?> _getAccessToken() async {
    return AuthSessionManager.getAccessToken();
  }

  Future<void> _loadCartItems() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final token = await _getAccessToken();
      final data = await _cartService.listar(accessToken: token);
      _applyCartData(data);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _applyCartData(Map<String, dynamic> data) {
    final rawItems = data['items'];
    final items = rawItems is List ? rawItems.whereType<Map<String, dynamic>>().toList() : <Map<String, dynamic>>[];

    setState(() {
      _cartItems = items;
      _subtotal = double.tryParse(data['subtotal']?.toString() ?? '0') ?? 0;
      _total = double.tryParse(data['total']?.toString() ?? '0') ?? _subtotal;
      _loading = false;
      _error = '';
    });
  }

  Future<void> _actualizarCantidad(Map<String, dynamic> item, int nuevaCantidad) async {
    if (nuevaCantidad <= 0) return;

    final itemId = item['id'];
    if (itemId is! int) return;

    setState(() => _processing = true);
    try {
      final token = await _getAccessToken();
      final data = await _cartService.actualizarItem(
        itemId: itemId,
        cantidad: nuevaCantidad,
        accessToken: token,
      );
      _applyCartData(data);
    } catch (e) {
      _showError('No se pudo actualizar: $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _eliminarProducto(Map<String, dynamic> item) async {
    final itemId = item['id'];
    if (itemId is! int) return;

    setState(() => _processing = true);
    try {
      final token = await _getAccessToken();
      final data = await _cartService.eliminarItem(itemId: itemId, accessToken: token);
      _applyCartData(data);
    } catch (e) {
      _showError('No se pudo eliminar: $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  Future<void> _confirmarCompra() async {
    setState(() => _processing = true);

    try {
      final token = await _getAccessToken();
      final data = await _cartService.confirmar(
        accessToken: token,
        observacion: 'Compra realizada desde app móvil',
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Compra confirmada. Venta #${data['venta']?['id'] ?? ''} ✅'),
          backgroundColor: const Color(0xFF006A5E),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _loadCartItems();
    } catch (e) {
      _showError('No se pudo confirmar la compra: $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFBA1A1A),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAF9),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF006A5E))),
      );
    }

    if (_error.isNotEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAF9),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_cart_checkout_rounded, color: Color(0xFFBA1A1A), size: 56),
                const SizedBox(height: 12),
                Text('No se pudo cargar el carrito', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(_error, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF6F7977))),
                const SizedBox(height: 16),
                ElevatedButton(onPressed: _loadCartItems, child: const Text('Reintentar')),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF9),
      body: RefreshIndicator(
        color: const Color(0xFF006A5E),
        onRefresh: _loadCartItems,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
              child: Row(
                children: [
                  Text('Mi Carrito', style: GoogleFonts.manrope(fontSize: 24, fontWeight: FontWeight.w800, color: const Color(0xFF191C1C))),
                  const Spacer(),
                  Text('${_cartItems.length} ítems', style: GoogleFonts.manrope(color: const Color(0xFF6F7977), fontWeight: FontWeight.w600)),
                ],
              ),
            ),
            if (_processing) const LinearProgressIndicator(color: Color(0xFF006A5E), minHeight: 2),
            Expanded(
              child: _cartItems.isEmpty
                  ? _buildEmptyCart()
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: _cartItems.length,
                      itemBuilder: (context, index) => _buildCartItem(_cartItems[index]),
                    ),
            ),
            _buildOrderSummary(),
          ],
        ),
      ),
    );
  }

  Widget _buildCartItem(Map<String, dynamic> item) {
    final cantidad = int.tryParse(item['cantidad']?.toString() ?? '1') ?? 1;
    final precio = double.tryParse(item['precio_unitario']?.toString() ?? '0') ?? 0;
    final nombre = item['producto_nombre']?.toString() ?? 'Medicamento';
    final sku = item['producto_sku']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE0E3E1)),
      ),
      child: Row(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(color: const Color(0xFFF0F2F1), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.medication_liquid_rounded, color: Color(0xFF006A5E), size: 34),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(nombre, style: GoogleFonts.manrope(fontWeight: FontWeight.w700, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
                if (sku.isNotEmpty) Text('SKU: $sku', style: GoogleFonts.manrope(fontSize: 12, color: const Color(0xFF6F7977))),
                const SizedBox(height: 8),
                Text('Bs ${precio.toStringAsFixed(2)}', style: GoogleFonts.manrope(fontWeight: FontWeight.w800, color: const Color(0xFF006A5E), fontSize: 16)),
              ],
            ),
          ),
          Column(
            children: [
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Color(0xFFBA1A1A)),
                onPressed: _processing ? null : () => _eliminarProducto(item),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, size: 22),
                    color: const Color(0xFF006A5E),
                    onPressed: _processing || cantidad <= 1 ? null : () => _actualizarCantidad(item, cantidad - 1),
                  ),
                  Text('x$cantidad', style: GoogleFonts.manrope(fontWeight: FontWeight.w700)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 22),
                    color: const Color(0xFF006A5E),
                    onPressed: _processing ? null : () => _actualizarCantidad(item, cantidad + 1),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderSummary() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, -5))],
      ),
      child: SafeArea(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Subtotal', style: GoogleFonts.manrope(fontSize: 15, color: const Color(0xFF6F7977))),
                Text('Bs ${_subtotal.toStringAsFixed(2)}', style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total estimado', style: GoogleFonts.manrope(fontSize: 16, color: const Color(0xFF6F7977))),
                Text('Bs ${_total.toStringAsFixed(2)}', style: GoogleFonts.manrope(fontSize: 22, fontWeight: FontWeight.w800, color: const Color(0xFF006A5E))),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: _cartItems.isEmpty || _processing ? null : _confirmarCompra,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF006A5E),
                  disabledBackgroundColor: const Color(0xFFE0E3E1),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  elevation: 0,
                ),
                child: _processing
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Finalizar Compra', style: GoogleFonts.manrope(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCart() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 160),
        Icon(Icons.shopping_cart_outlined, size: 80, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Center(child: Text('Tu carrito está vacío', style: GoogleFonts.manrope(fontSize: 18, color: Colors.grey))),
      ],
    );
  }
}
