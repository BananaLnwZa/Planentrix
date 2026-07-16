import 'package:flutter/material.dart';

const String _fontFamily = 'Sansation';
const Color _accentColor = Color(0xFF9CC5F9);
const Color _inputBorderColor = Color(0x4D000000);

class GenderOption {
  final String id;
  final String label;
  final Color color;

  const GenderOption({
    required this.id,
    required this.label,
    required this.color,
  });
}

class SelectGender extends StatefulWidget {
  final String? value;
  final ValueChanged<String>? onChanged;

  const SelectGender({super.key, this.value, this.onChanged});

  @override
  State<SelectGender> createState() => _SelectGenderState();
}

class _SelectGenderState extends State<SelectGender> {
  final LayerLink _layerLink = LayerLink();

  // ใช้วัดเฉพาะช่อง dropdown ไม่รวม label
  final GlobalKey _fieldKey = GlobalKey();

  OverlayEntry? _overlayEntry;

  String? _selectedGender;
  bool _isOpen = false;

  final List<GenderOption> genders = const [
    GenderOption(id: 'Male', label: 'Male', color: Color(0xFFBBDEF4)),
    GenderOption(id: 'Female', label: 'Female', color: Color(0xFFF8DCE4)),
    GenderOption(id: 'Other', label: 'Other', color: Color(0xFFE7CFF2)),
  ];

  @override
  void initState() {
    super.initState();
    _selectedGender = widget.value;
  }

  @override
  void didUpdateWidget(covariant SelectGender oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.value != widget.value) {
      _selectedGender = widget.value;
    }
  }

  GenderOption? get selectedOption {
    for (final gender in genders) {
      if (gender.id == _selectedGender) {
        return gender;
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

    final overlay = Overlay.of(context, rootOverlay: true);

    setState(() {
      _isOpen = true;
    });

    _overlayEntry = _createOverlayEntry();
    overlay.insert(_overlayEntry!);
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

  void _selectGender(String gender) {
    setState(() {
      _selectedGender = gender;
    });

    widget.onChanged?.call(gender);
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
            // กดพื้นที่ด้านนอกเพื่อปิด
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _closeDropdown,
                child: const SizedBox.expand(),
              ),
            ),

            // Popup ต่อจากช่อง dropdown ทันที
            Positioned(
              width: fieldSize.width,
              child: CompositedTransformFollower(
                link: _layerLink,
                showWhenUnlinked: false,

                // ใช้ความสูงของช่อง dropdown เท่านั้น
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
                        children: List.generate(genders.length, (index) {
                          final gender = genders[index];

                          final bool isSelected = _selectedGender == gender.id;

                          return _GenderItem(
                            option: gender,
                            isSelected: isSelected,
                            showDivider: index != genders.length - 1,
                            onTap: () {
                              _selectGender(gender.id);
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

    final GenderOption? currentOption = selectedOption;

    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'gender',
            style: TextStyle(
              fontFamily: _fontFamily,
              fontWeight: FontWeight.w400,
              fontSize: 14,
              color: Colors.black87,
            ),
          ),

          const SizedBox(height: 8),

          CompositedTransformTarget(
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
                        _selectedGender ?? 'select gender',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: _fontFamily,
                          fontWeight: FontWeight.w300,
                          fontSize: currentOption == null ? 13 : 14,
                          color: currentOption == null
                              ? const Color(0x80000000)
                              : Colors.black,
                        ),
                      ),
                    ),

                    AnimatedRotation(
                      turns: _isOpen ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.arrow_drop_down,
                        size: 28,
                        color: Color(0xFFE7CFF2),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GenderItem extends StatefulWidget {
  final GenderOption option;
  final bool isSelected;
  final bool showDivider;
  final VoidCallback onTap;

  const _GenderItem({
    required this.option,
    required this.isSelected,
    required this.showDivider,
    required this.onTap,
  });

  @override
  State<_GenderItem> createState() => _GenderItemState();
}

class _GenderItemState extends State<_GenderItem> {
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
          height: 46,
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
                color: isActive ? widget.option.color : Colors.black87,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
