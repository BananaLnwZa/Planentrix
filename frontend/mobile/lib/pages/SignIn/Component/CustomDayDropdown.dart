import 'package:flutter/material.dart';

const String _fontFamily = 'Sansation';
const Color _accentColor = Color(0xFF9CC5F9);
const Color _inputBorderColor = Color(0x4D000000);

class DayOption {
  final String id;
  final String label;
  final Color color;

  const DayOption({required this.id, required this.label, required this.color});
}

class CustomDayDropdown extends StatefulWidget {
  final String? value;
  final ValueChanged<String> onChanged;

  const CustomDayDropdown({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  State<CustomDayDropdown> createState() => _CustomDayDropdownState();
}

class _CustomDayDropdownState extends State<CustomDayDropdown> {
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _fieldKey = GlobalKey();

  OverlayEntry? _overlayEntry;
  bool _isOpen = false;

  final List<DayOption> days = const [
    DayOption(id: 'Monday', label: 'Monday', color: Color(0xFFF7E380)),
    DayOption(id: 'Tuesday', label: 'Tuesday', color: Color(0xFFF5B5CB)),
    DayOption(id: 'Wednesday', label: 'Wednesday', color: Color(0xFFB5E48C)),
    DayOption(id: 'Thursday', label: 'Thursday', color: Color(0xFFFBC49C)),
    DayOption(id: 'Friday', label: 'Friday', color: Color(0xFF71B7E4)),
    DayOption(id: 'Saturday', label: 'Saturday', color: Color(0xFFD8B8E8)),
    DayOption(id: 'Sunday', label: 'Sunday', color: Color(0xFFFB9A92)),
  ];

  DayOption? get selectedOption {
    for (final day in days) {
      if (day.id == widget.value) {
        return day;
      }
    }

    return null;
  }

  void _toggleDropdown() {
    if (_isOpen) {
      _closeDropdown();
    } else {
      _openDropdown();
    }
  }

  void _openDropdown() {
    if (_overlayEntry != null) return;

    setState(() {
      _isOpen = true;
    });

    _overlayEntry = _createOverlayEntry();

    Overlay.of(context, rootOverlay: true).insert(_overlayEntry!);
  }

  void _closeDropdown() {
    _overlayEntry?.remove();
    _overlayEntry = null;

    if (mounted) {
      setState(() {
        _isOpen = false;
      });
    }
  }

  void _selectDay(String day) {
    widget.onChanged(day);
    _closeDropdown();
  }

  OverlayEntry _createOverlayEntry() {
    final RenderBox fieldRenderBox =
        _fieldKey.currentContext!.findRenderObject() as RenderBox;

    final Size fieldSize = fieldRenderBox.size;

    return OverlayEntry(
      builder: (context) {
        return Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _closeDropdown,
                child: const SizedBox.expand(),
              ),
            ),

            Positioned(
              width: fieldSize.width,
              child: CompositedTransformFollower(
                link: _layerLink,
                showWhenUnlinked: false,
                offset: Offset(0, fieldSize.height - 1),
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: _inputBorderColor),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(25),
                        bottomRight: Radius.circular(25),
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black12,
                          blurRadius: 12,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(25),
                        bottomRight: Radius.circular(25),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(days.length, (index) {
                          final day = days[index];

                          return _DayDropdownItem(
                            option: day,
                            isSelected: widget.value == day.id,
                            showDivider: index != days.length - 1,
                            onTap: () {
                              _selectDay(day.id);
                            },
                          );
                        }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const double fieldHeight = 46;
    const double horizontalPadding = 20;

    return SizedBox(
      width: double.infinity,
      child: CompositedTransformTarget(
        key: _fieldKey,
        link: _layerLink,
        child: InkWell(
          onTap: _toggleDropdown,
          borderRadius: BorderRadius.circular(25),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            height: fieldHeight,
            padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(
                color: _isOpen ? _accentColor : _inputBorderColor,
              ),
              borderRadius: _isOpen
                  ? const BorderRadius.only(
                      topLeft: Radius.circular(25),
                      topRight: Radius.circular(25),
                    )
                  : BorderRadius.circular(25),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.value?.isNotEmpty == true
                        ? widget.value!
                        : 'เลือกวันที่ต้องการหยุด',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: _fontFamily,
                      fontWeight: FontWeight.w300,
                      fontSize: widget.value?.isNotEmpty == true ? 14 : 13,
                      color: widget.value?.isNotEmpty == true
                          ? Colors.black
                          : const Color(0x80000000),
                    ),
                  ),
                ),

                AnimatedRotation(
                  turns: _isOpen ? 0.5 : 0,
                  duration: const Duration(milliseconds: 200),
                  child: const Icon(
                    Icons.arrow_drop_down,
                    size: 26,
                    color: Color(0xFFE7CFF2),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DayDropdownItem extends StatefulWidget {
  final DayOption option;
  final bool isSelected;
  final bool showDivider;
  final VoidCallback onTap;

  const _DayDropdownItem({
    required this.option,
    required this.isSelected,
    required this.showDivider,
    required this.onTap,
  });

  @override
  State<_DayDropdownItem> createState() => _DayDropdownItemState();
}

class _DayDropdownItemState extends State<_DayDropdownItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final bool isActive = widget.isSelected || _isHovered;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() {
          _isHovered = true;
        });
      },
      onExit: (_) {
        setState(() {
          _isHovered = false;
        });
      },
      child: InkWell(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: widget.showDivider
                  ? BorderSide(color: Colors.grey.shade200)
                  : BorderSide.none,
            ),
          ),
          child: Container(
            key: Key('day-dropdown-option-${widget.option.id}'),
            width: double.infinity,
            height: double.infinity,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(
                color: isActive ? widget.option.color : Colors.transparent,
              ),
            ),
            child: Text(
              widget.option.label,
              style: TextStyle(
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w300,
                fontSize: 14,
                color: isActive ? widget.option.color : Colors.grey.shade700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
