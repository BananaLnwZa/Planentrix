import 'package:flutter/material.dart';

class AddHomeworkButton extends StatefulWidget {
  final double scale;
  final VoidCallback onPressed;

  const AddHomeworkButton({
    super.key,
    required this.scale,
    required this.onPressed,
  });

  @override
  State<AddHomeworkButton> createState() => _AddHomeworkButtonState();
}

class _AddHomeworkButtonState extends State<AddHomeworkButton> {
  bool _isHovered = false;
  bool _isPressed = false;

  bool get _isActive => _isHovered || _isPressed;

  @override
  Widget build(BuildContext context) {
    final scale = widget.scale;
    return Semantics(
      button: true,
      label: 'เพิ่มงาน',
      child: MouseRegion(
        onEnter: (_) => setState(() => _isHovered = true),
        onExit: (_) => setState(() => _isHovered = false),
        child: AnimatedContainer(
          key: const Key('homework-add-button'),
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOut,
          width: 60 * scale,
          height: 25 * scale,
          decoration: BoxDecoration(
            color: _isActive ? const Color(0xFFE29DC7) : Colors.white,
            borderRadius: BorderRadius.circular(12 * scale),
            border: Border.all(
              color: _isActive ? Colors.white : const Color(0xFFE29DC7),
              width: 1.5 * scale,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0x40000000),
                blurRadius: 3 * scale,
                offset: Offset(0, 2 * scale),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: widget.onPressed,
              onHighlightChanged: (value) => setState(() => _isPressed = value),
              borderRadius: BorderRadius.circular(12 * scale),
              child: Center(
                child: Transform.translate(
                  offset: Offset(0, 1 * scale),
                  child: AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 140),
                    curve: Curves.easeOut,
                    style: TextStyle(
                      color: _isActive ? Colors.white : const Color(0xFFE29DC7),
                      fontSize: 12 * scale,
                      height: 1,
                    ),
                    child: const Text(
                      'เพิ่มงาน',
                      key: Key('homework-add-label'),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
