// ignore_for_file: file_names

import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

class AppDropdownItem<T> {
  final T value;
  final String label;
  final Color? accentColor;
  final Color? borderColor;
  final bool enabled;
  final Key? optionKey;

  const AppDropdownItem({
    required this.value,
    required this.label,
    this.accentColor,
    this.borderColor,
    this.enabled = true,
    this.optionKey,
  });
}

class AppDropdown<T> extends StatefulWidget {
  final T? value;
  final List<AppDropdownItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String hintText;
  final String? labelText;
  final bool enabled;
  final double fieldHeight;
  final double itemHeight;
  final double maxMenuHeight;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final Color borderColor;
  final Color activeBorderColor;
  final Color fillColor;
  final TextStyle? textStyle;
  final TextStyle? hintStyle;
  final bool showCheck;

  const AppDropdown({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
    this.hintText = 'เลือกข้อมูล',
    this.labelText,
    this.enabled = true,
    this.fieldHeight = 46,
    this.itemHeight = 44,
    this.maxMenuHeight = 280,
    this.borderRadius = 22,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
    this.borderColor = const Color(0xFFD1D5DB),
    this.activeBorderColor = const Color(0xFFB899D0),
    this.fillColor = Colors.white,
    this.textStyle,
    this.hintStyle,
    this.showCheck = true,
  });

  @override
  State<AppDropdown<T>> createState() => _AppDropdownState<T>();
}

class _AppDropdownState<T> extends State<AppDropdown<T>> {
  final LayerLink _layerLink = LayerLink();
  final Object _tapGroupId = Object();
  final GlobalKey _fieldKey = GlobalKey();
  OverlayEntry? _overlayEntry;
  bool _isOpen = false;
  bool _opensUp = false;
  int? _activeIndex;
  ScrollController? _menuScrollController;

  AppDropdownItem<T>? get _selectedItem {
    for (final item in widget.items) {
      if (item.value == widget.value) return item;
    }
    return null;
  }

  void _toggle() {
    if (!widget.enabled || widget.onChanged == null) return;
    if (_isOpen) {
      _close();
    } else {
      _open();
    }
  }

  void _open() {
    if (_overlayEntry != null || !mounted) return;
    final fieldBox = _fieldKey.currentContext?.findRenderObject() as RenderBox?;
    final overlay = Overlay.of(context, rootOverlay: true);
    final overlayBox = overlay.context.findRenderObject() as RenderBox?;
    if (fieldBox == null || overlayBox == null) return;

    final fieldOffset = fieldBox.localToGlobal(
      Offset.zero,
      ancestor: overlayBox,
    );
    final fieldSize = fieldBox.size;
    final below =
        overlayBox.size.height - fieldOffset.dy - fieldSize.height - 12;
    final above = fieldOffset.dy - 12;
    final contentHeight = widget.items.length * widget.itemHeight + 2;
    final desiredHeight = math.min(widget.maxMenuHeight, contentHeight);
    _opensUp = below < desiredHeight && above > below;
    final available = math.max(96.0, _opensUp ? above : below);
    final menuHeight = math.min(desiredHeight, available);

    final selectedIndex = widget.items.indexWhere(
      (item) => item.value == widget.value && item.enabled,
    );
    _activeIndex = selectedIndex >= 0
        ? selectedIndex
        : widget.items.indexWhere((item) => item.enabled);
    final maxInitialOffset = math.max(0.0, contentHeight - menuHeight);
    final canScroll = contentHeight > menuHeight;
    final selectedCenter = math.max(0, _activeIndex ?? 0) * widget.itemHeight;
    final initialOffset = math.min(
      maxInitialOffset,
      math.max(0.0, selectedCenter - (menuHeight - widget.itemHeight) / 2),
    );
    _menuScrollController?.dispose();
    _menuScrollController = ScrollController(
      initialScrollOffset: initialOffset,
    );

    setState(() => _isOpen = true);
    _overlayEntry = OverlayEntry(
      builder: (context) => Stack(
        children: [
          CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            targetAnchor: _opensUp ? Alignment.topLeft : Alignment.bottomLeft,
            followerAnchor: _opensUp ? Alignment.bottomLeft : Alignment.topLeft,
            offset: Offset(0, _opensUp ? 1 : -1),
            child: TapRegion(
              groupId: _tapGroupId,
              onTapOutside: (_) => _close(),
              child: SizedBox(
                width: fieldSize.width,
                height: menuHeight,
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: widget.borderColor),
                      borderRadius: _opensUp
                          ? BorderRadius.vertical(
                              top: Radius.circular(widget.borderRadius),
                            )
                          : BorderRadius.vertical(
                              bottom: Radius.circular(widget.borderRadius),
                            ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x24000000),
                          blurRadius: 14,
                          offset: Offset(0, 7),
                        ),
                      ],
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: ScrollConfiguration(
                      behavior: ScrollConfiguration.of(context).copyWith(
                        dragDevices: const {
                          PointerDeviceKind.touch,
                          PointerDeviceKind.mouse,
                          PointerDeviceKind.trackpad,
                          PointerDeviceKind.stylus,
                        },
                        scrollbars: false,
                      ),
                      child: Scrollbar(
                        controller: _menuScrollController,
                        thumbVisibility: canScroll,
                        child: ListView.builder(
                          controller: _menuScrollController,
                          padding: EdgeInsets.zero,
                          physics: canScroll
                              ? const ClampingScrollPhysics()
                              : const NeverScrollableScrollPhysics(),
                          itemCount: widget.items.length,
                          itemExtent: widget.itemHeight,
                          itemBuilder: (context, index) {
                            final item = widget.items[index];
                            final selected = item.value == widget.value;
                            final accent =
                                item.accentColor ?? const Color(0xFF9A6FB1);
                            final active = index == _activeIndex;
                            return MouseRegion(
                              onEnter: item.enabled
                                  ? (_) {
                                      if (_activeIndex == index) return;
                                      _activeIndex = index;
                                      _overlayEntry?.markNeedsBuild();
                                    }
                                  : null,
                              child: InkWell(
                                onTap: item.enabled
                                    ? () {
                                        widget.onChanged?.call(item.value);
                                        _close();
                                      }
                                    : null,
                                child: Container(
                                  key: item.optionKey,
                                  alignment: Alignment.center,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                  decoration: BoxDecoration(
                                    color: active || selected
                                        ? accent.withValues(alpha: 0.06)
                                        : Colors.white,
                                    border: Border(
                                      bottom: BorderSide(
                                        color: index == widget.items.length - 1
                                            ? Colors.transparent
                                            : const Color(0xFFE8E8E8),
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Flexible(
                                        child: Text(
                                          item.label,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontFamily: 'Sansation',
                                            fontSize: widget.itemHeight <= 38
                                                ? 11
                                                : 14,
                                            fontWeight: selected
                                                ? FontWeight.w600
                                                : FontWeight.w300,
                                            color: active || selected
                                                ? accent
                                                : const Color(0xFF4B5563),
                                          ),
                                        ),
                                      ),
                                      if (widget.showCheck && selected) ...[
                                        const SizedBox(width: 6),
                                        Icon(
                                          Icons.check_rounded,
                                          size: 16,
                                          color: accent,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
    overlay.insert(_overlayEntry!);
  }

  void _close() {
    if (_overlayEntry == null && !_isOpen) return;
    _overlayEntry?.remove();
    _overlayEntry = null;
    _menuScrollController?.dispose();
    _menuScrollController = null;
    if (mounted) setState(() => _isOpen = false);
  }

  @override
  void didUpdateWidget(covariant AppDropdown<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.enabled && _isOpen) {
      _overlayEntry?.remove();
      _overlayEntry = null;
      _menuScrollController?.dispose();
      _menuScrollController = null;
      _isOpen = false;
    }
  }

  @override
  void dispose() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    _menuScrollController?.dispose();
    _menuScrollController = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedItem;
    final field = TapRegion(
      groupId: _tapGroupId,
      onTapOutside: _isOpen ? (_) => _close() : null,
      child: CompositedTransformTarget(
        key: _fieldKey,
        link: _layerLink,
        child: Semantics(
          button: true,
          enabled: widget.enabled,
          expanded: _isOpen,
          label: widget.labelText ?? widget.hintText,
          value: selected?.label,
          child: InkWell(
            onTap: _toggle,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              height: widget.fieldHeight,
              padding: widget.padding,
              decoration: BoxDecoration(
                color: widget.enabled
                    ? widget.fillColor
                    : const Color(0xFFF3F3F3),
                border: Border.all(color: widget.borderColor),
                borderRadius: !_isOpen
                    ? BorderRadius.circular(widget.borderRadius)
                    : _opensUp
                    ? BorderRadius.vertical(
                        bottom: Radius.circular(widget.borderRadius),
                      )
                    : BorderRadius.vertical(
                        top: Radius.circular(widget.borderRadius),
                      ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      selected?.label ?? widget.hintText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: selected == null
                          ? widget.hintStyle ??
                                const TextStyle(
                                  fontFamily: 'Sansation',
                                  fontSize: 13,
                                  fontWeight: FontWeight.w300,
                                  color: Color(0x80000000),
                                )
                          : widget.textStyle ??
                                const TextStyle(
                                  fontFamily: 'Sansation',
                                  fontSize: 14,
                                  fontWeight: FontWeight.w300,
                                  color: Color(0xFF333333),
                                ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: _isOpen ? 0.5 : 0,
                    duration: const Duration(milliseconds: 180),
                    child: const Icon(
                      Icons.arrow_drop_down_rounded,
                      size: 26,
                      color: Color(0xFFC7A8D9),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (widget.labelText == null) return field;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.labelText!,
          style: const TextStyle(
            fontFamily: 'Sansation',
            fontSize: 13,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 7),
        field,
      ],
    );
  }
}
