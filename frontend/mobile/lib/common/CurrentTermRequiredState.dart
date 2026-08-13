import 'package:flutter/material.dart';

class CurrentTermRequiredState extends StatelessWidget {
  final String detail;

  const CurrentTermRequiredState({super.key, required this.detail});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 250,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFFF3FAFE),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: const Color(0xFFCFE7F4)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0x12000000),
                  blurRadius: 5,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: SizedBox(
              width: 56,
              height: 56,
              child: Icon(
                Icons.menu_book_outlined,
                size: 28,
                color: Color(0xFF66B3DE),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'ยังไม่มีเทอมปัจจุบัน',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFF31566C),
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            detail,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF566F7D),
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
