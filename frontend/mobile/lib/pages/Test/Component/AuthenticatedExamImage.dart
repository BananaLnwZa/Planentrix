import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../services/api.service.dart';

class AuthenticatedExamImage extends StatefulWidget {
  final String imageUrl;
  final double height;
  final String errorText;

  const AuthenticatedExamImage({
    super.key,
    required this.imageUrl,
    required this.height,
    required this.errorText,
  });

  @override
  State<AuthenticatedExamImage> createState() => _AuthenticatedExamImageState();
}

class _AuthenticatedExamImageState extends State<AuthenticatedExamImage> {
  late Future<Uint8List> _imageBytes;

  @override
  void initState() {
    super.initState();
    _imageBytes = _loadImage();
  }

  @override
  void didUpdateWidget(covariant AuthenticatedExamImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _imageBytes = _loadImage();
    }
  }

  Future<Uint8List> _loadImage() async {
    final response = await ApiService().get(
      widget.imageUrl,
      options: Options(responseType: ResponseType.bytes),
    );
    final data = response.data;
    if (data is Uint8List) return data;
    if (data is List<int>) return Uint8List.fromList(data);
    throw const FormatException('Invalid image response');
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _imageBytes,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return Image.memory(
            snapshot.data!,
            width: double.infinity,
            height: widget.height,
            fit: BoxFit.contain,
          );
        }
        if (snapshot.hasError) {
          return Container(
            height: widget.height / 2,
            alignment: Alignment.center,
            color: const Color(0xFFF4F7F8),
            child: Text(
              widget.errorText,
              style: const TextStyle(fontSize: 10, color: Color(0xFF8A9BA2)),
            ),
          );
        }
        return SizedBox(
          height: widget.height,
          child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
        );
      },
    );
  }
}
