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
      yearLevel: '${json['year_level'] ?? ''}',
      term: '${json['term'] ?? ''}',
      academicYear: '${json['academic_year'] ?? ''}',
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
  final DateTime examStartDate;
  final DateTime examEndDate;

  const CreateTermRequest({
    required this.yearLevel,
    required this.term,
    required this.academicYear,
    required this.examStartDate,
    required this.examEndDate,
  });

  Map<String, dynamic> toJson() {
    final start = _dateOnly(examStartDate);
    final end = _dateOnly(examEndDate);
    return {
      'year_level': yearLevel,
      'term': term,
      'academic_year': academicYear,
      'start_midterm': start,
      'end_midterm': end,
      'start_final': start,
      'end_final': end,
    };
  }

  CurrentTerm toCurrentTerm(int termId) {
    return CurrentTerm(
      termId: termId,
      yearLevel: yearLevel,
      term: term,
      academicYear: academicYear,
      startMidterm: examStartDate,
      endMidterm: examEndDate,
      startFinal: examStartDate,
      endFinal: examEndDate,
    );
  }

  static String _dateOnly(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }
}
