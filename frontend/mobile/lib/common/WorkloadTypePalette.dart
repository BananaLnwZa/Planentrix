import 'package:flutter/material.dart';

class WorkloadTypePalette {
  final Color normal;
  final Color hover;

  const WorkloadTypePalette(this.normal, this.hover);
}

const _workloadTypePalettes = <String, WorkloadTypePalette>{
  'quiz': WorkloadTypePalette(Color(0xFFC5DBAA), Color(0xFFA5BE85)),
  'final': WorkloadTypePalette(Color(0xFFFFE7AB), Color(0xFFF6D481)),
  'midterm': WorkloadTypePalette(Color(0xFFB3F7EF), Color(0xFF74DBD0)),
  'project': WorkloadTypePalette(Color(0xFFFA86A3), Color(0xFFD45A78)),
  'assignment': WorkloadTypePalette(Color(0xFFEECDF9), Color(0xFFD19EE2)),
};

WorkloadTypePalette workloadTypePalette(String typeName) =>
    _workloadTypePalettes[typeName.trim().toLowerCase()] ??
    const WorkloadTypePalette(Color(0xFFE6E6E6), Color(0xFFBDBDBD));
