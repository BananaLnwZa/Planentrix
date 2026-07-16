import 'package:flutter/material.dart';
import 'BusyDayModal.dart';

const String _fontFamily = 'Sansation';

class BusyDayItem {
  final String id;
  final String day;
  final String start;
  final String end;

  const BusyDayItem({
    required this.id,
    required this.day,
    required this.start,
    required this.end,
  });

  BusyDayItem copyWith({String? day, String? start, String? end}) {
    return BusyDayItem(
      id: id,
      day: day ?? this.day,
      start: start ?? this.start,
      end: end ?? this.end,
    );
  }
}

class BusyDay extends StatefulWidget {
  const BusyDay({super.key});

  @override
  State<BusyDay> createState() => _BusyDayState();
}

class _BusyDayState extends State<BusyDay> {
  final List<BusyDayItem> items = [];

  String _generateId() {
    return DateTime.now().microsecondsSinceEpoch.toString();
  }

  Future<void> _openBusyDayModal({BusyDayItem? item}) async {
    await showDialog<void>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.30),
      builder: (dialogContext) {
        return BusyDayModal(
          editItem: item == null
              ? null
              : BusyDayEditItem(
                  id: item.id,
                  day: item.day,
                  start: item.start,
                  end: item.end,
                ),
          onConfirm: (String day, String start, String end) {
            if (!mounted) return;

            setState(() {
              if (item != null) {
                final int index = items.indexWhere(
                  (currentItem) => currentItem.id == item.id,
                );

                if (index != -1) {
                  items[index] = items[index].copyWith(
                    day: day,
                    start: start,
                    end: end,
                  );
                }
              } else {
                items.add(
                  BusyDayItem(
                    id: _generateId(),
                    day: day,
                    start: start,
                    end: end,
                  ),
                );
              }
            });
          },
        );
      },
    );
  }

  void _deleteItem(String id) {
    if (!mounted) return;

    setState(() {
      items.removeWhere((item) => item.id == id);
    });
  }

  Future<void> _confirmDelete(BusyDayItem item) async {
    final bool? shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Text('ลบวันเวลาที่ไม่ว่าง'),
          content: Text(
            'ต้องการลบ ${item.day} '
            '${item.start} - ${item.end} หรือไม่?',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop(false);
              },
              child: const Text('ยกเลิก', style: TextStyle(color: Colors.grey)),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop(true);
              },
              child: const Text(
                'ลบ',
                style: TextStyle(color: Color(0xFFFF8E8E)),
              ),
            ),
          ],
        );
      },
    );

    if (!mounted) return;

    if (shouldDelete == true) {
      _deleteItem(item.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;

    final bool mobile = screenWidth < 600;

    const double labelSize = 14;
    const double itemFontSize = 14;
    final double listPadding = mobile ? 14 : 20;

    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'วันเวลาไม่ว่างประจำ',
            style: TextStyle(
              fontSize: labelSize,
              fontFamily: _fontFamily,
              fontWeight: FontWeight.w300,
              color: Colors.black87,
            ),
          ),

          const SizedBox(height: 10),

          Container(
            key: const Key('busy-day-input'),
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 70),
            padding: EdgeInsets.all(listPadding),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(25),
              border: Border.all(color: const Color(0x4D000000), width: 1),
            ),
            child: items.isEmpty
                ? SizedBox(
                    height: 40,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'ยังไม่มีข้อมูล',
                        style: TextStyle(
                          fontSize: itemFontSize,
                          fontFamily: _fontFamily,
                          fontWeight: FontWeight.w300,
                          color: const Color(0x80000000),
                        ),
                      ),
                    ),
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: List.generate(items.length, (index) {
                      final item = items[index];

                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index == items.length - 1 ? 0 : 4,
                        ),
                        child: _BusyDayRow(
                          item: item,
                          fontSize: itemFontSize,
                          onEdit: () {
                            _openBusyDayModal(item: item);
                          },
                          onDelete: () {
                            _confirmDelete(item);
                          },
                        ),
                      );
                    }),
                  ),
          ),

          const SizedBox(height: 16),

          Center(
            child: _AddButton(
              onPressed: () {
                _openBusyDayModal();
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BusyDayRow extends StatelessWidget {
  final BusyDayItem item;
  final double fontSize;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _BusyDayRow({
    required this.item,
    required this.fontSize,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: Row(
        children: [
          const SizedBox(
            width: 8,
            height: 8,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xFFBBDEF4),
                shape: BoxShape.circle,
              ),
            ),
          ),

          const SizedBox(width: 8),

          SizedBox(
            width: 58,
            child: Text(
              item.day,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: fontSize,
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w300,
                color: Colors.grey.shade700,
              ),
            ),
          ),

          Expanded(
            child: Text(
              '${item.start} - ${item.end}',
              maxLines: 1,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: fontSize,
                fontFamily: _fontFamily,
                fontWeight: FontWeight.w300,
                color: Colors.black87,
              ),
            ),
          ),

          const SizedBox(width: 4),

          _ActionButton(
            tooltip: 'แก้ไข',
            icon: Icons.edit_outlined,
            iconColor: const Color(0xFFA9D7F5),
            hoverColor: const Color(0xFFEAF6FD),
            onPressed: onEdit,
          ),

          const SizedBox(width: 4),

          _ActionButton(
            tooltip: 'ลบ',
            icon: Icons.delete_outline,
            iconColor: const Color(0xFFFF8E8E),
            hoverColor: const Color(0xFFFFF0F0),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatefulWidget {
  final String tooltip;
  final IconData icon;
  final Color iconColor;
  final Color hoverColor;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.tooltip,
    required this.icon,
    required this.iconColor,
    required this.hoverColor,
    required this.onPressed,
  });

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool isHovered = false;

  void _setHovered(bool value) {
    if (!mounted) return;

    setState(() {
      isHovered = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.tooltip,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) {
          _setHovered(true);
        },
        onExit: (_) {
          _setHovered(false);
        },
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(50),
            onTap: widget.onPressed,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              width: 30,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isHovered ? widget.hoverColor : Colors.transparent,
                shape: BoxShape.circle,
              ),
              child: Icon(widget.icon, size: 17, color: widget.iconColor),
            ),
          ),
        ),
      ),
    );
  }
}

class _AddButton extends StatefulWidget {
  final VoidCallback onPressed;

  const _AddButton({required this.onPressed});

  @override
  State<_AddButton> createState() => _AddButtonState();
}

class _AddButtonState extends State<_AddButton> {
  bool isHovered = false;
  bool isPressed = false;

  void _updateState({bool? hovered, bool? pressed}) {
    if (!mounted) return;

    setState(() {
      if (hovered != null) {
        isHovered = hovered;
      }

      if (pressed != null) {
        isPressed = pressed;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    double scale = 1;

    if (isPressed) {
      scale = 0.95;
    } else if (isHovered) {
      scale = 1.05;
    }

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        _updateState(hovered: true);
      },
      onExit: (_) {
        _updateState(hovered: false, pressed: false);
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) {
          _updateState(pressed: true);
        },
        onTapUp: (_) {
          _updateState(pressed: false);
        },
        onTapCancel: () {
          _updateState(pressed: false);
        },
        onTap: widget.onPressed,
        child: AnimatedScale(
          scale: scale,
          duration: const Duration(milliseconds: 160),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 130,
            height: 48,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isHovered
                  ? const Color(0xFF9DD0F1)
                  : const Color(0xFFA9D7F5),
              borderRadius: BorderRadius.circular(24),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black12,
                  blurRadius: 4,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: const Text(
              '+',
              style: TextStyle(
                height: 1,
                fontSize: 34,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
