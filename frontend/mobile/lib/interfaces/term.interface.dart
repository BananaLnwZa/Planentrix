class CurrentTerm {
  final int termId;
  final String yearLevel;
  final String term;
  final String academicYear;
  final DateTime? startMidterm;
  final DateTime? endMidterm;
  final DateTime? startFinal;
  final DateTime? endFinal;
  final int termStatus;

  const CurrentTerm({
    required this.termId,
    required this.yearLevel,
    required this.term,
    required this.academicYear,
    this.startMidterm,
    this.endMidterm,
    this.startFinal,
    this.endFinal,
    this.termStatus = 1,
  });

  factory CurrentTerm.fromJson(Map<String, dynamic> json) {
    return CurrentTerm(
      termId: _asInt(json['term_id']),
      yearLevel: '${json['academic_year'] ?? ''}',
      term: '${json['term'] ?? ''}',
      academicYear: '${json['semester'] ?? ''}',
      startMidterm: _asDate(json['start_midterm']),
      endMidterm: _asDate(json['end_midterm']),
      startFinal: _asDate(json['start_final']),
      endFinal: _asDate(json['end_final']),
      termStatus: _asInt(json['term_status'], fallback: 1),
    );
  }

  static int _asInt(dynamic value, {int fallback = 0}) {
    if (value is int) return value;
    return int.tryParse('$value') ?? fallback;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null || '$value'.isEmpty) return null;
    return DateTime.tryParse('$value');
  }
}

class CreateTermRequest {
  final String yearLevel;
  final String term;
  final String academicYear;
  final DateTime midtermStartDate;
  final DateTime midtermEndDate;
  final DateTime finalStartDate;
  final DateTime finalEndDate;

  const CreateTermRequest({
    required this.yearLevel,
    required this.term,
    required this.academicYear,
    required this.midtermStartDate,
    required this.midtermEndDate,
    required this.finalStartDate,
    required this.finalEndDate,
  });

  Map<String, dynamic> toJson() {
    return {
      'academic_year': int.parse(yearLevel),
      'semester': academicYear,
      'term': int.parse(term),
      'start_midterm': _dateOnly(midtermStartDate),
      'end_midterm': _dateOnly(midtermEndDate),
      'start_final': _dateOnly(finalStartDate),
      'end_final': _dateOnly(finalEndDate),
    };
  }

  CurrentTerm toCurrentTerm(int termId) {
    return CurrentTerm(
      termId: termId,
      yearLevel: yearLevel,
      term: term,
      academicYear: academicYear,
      startMidterm: midtermStartDate,
      endMidterm: midtermEndDate,
      startFinal: finalStartDate,
      endFinal: finalEndDate,
    );
  }

  static String _dateOnly(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }
}
