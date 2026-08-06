import 'package:flutter/material.dart';

class StudentCard extends StatelessWidget {
  final String name;
  final String studentNumber;
  final String gender;
  final String major;
  final String year;
  final String birthDate;
  final ImageProvider<Object>? photo;
  final VoidCallback? onTap;

  const StudentCard({
    super.key,
    required this.name,
    required this.studentNumber,
    this.gender = '—',
    this.major = 'COMSCI',
    this.year = '—',
    this.birthDate = '—',
    this.photo,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Student identity card for $name',
      child: DecoratedBox(
        key: const Key('student-card-shadow'),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x40354045),
              blurRadius: 9,
              offset: Offset(0, 7),
            ),
          ],
        ),
        child: Material(
          key: const Key('student-card-surface'),
          color: Colors.white,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFF93A3AA)),
          ),
          child: InkWell(
            key: const Key('student-card'),
            onTap: onTap,
            customBorder: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            child: SizedBox(
              width: double.infinity,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _StudentCardHeader(studentNumber: studentNumber),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 94,
                          height: 112,
                          child: _StudentPhoto(photo: photo),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: _CardDetail(
                                      label: 'NAME',
                                      value: name,
                                    ),
                                  ),
                                  const SizedBox(width: 9),
                                  Expanded(
                                    child: _CardDetail(
                                      label: 'GENDER',
                                      value: gender,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: _CardDetail(
                                      label: 'MAJOR',
                                      value: major,
                                    ),
                                  ),
                                  const SizedBox(width: 9),
                                  Expanded(
                                    child: _CardDetail(
                                      label: 'YEAR',
                                      value: year,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: _CardDetail(
                                  label: 'BIRTHDAY',
                                  value: birthDate,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 6),
                    child: _SecurityPattern(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StudentCardHeader extends StatelessWidget {
  final String studentNumber;

  const _StudentCardHeader({required this.studentNumber});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFC7E8F8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Planentrix',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white,
                fontFamily: 'Sansation',
                fontSize: 29,
                fontWeight: FontWeight.w400,
                height: 1,
                shadows: [
                  Shadow(color: Color(0xFF9CC5F9), offset: Offset(2, 2)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                studentNumber,
                key: const Key('student-number'),
                style: const TextStyle(
                  color: Colors.white,
                  fontFamily: 'Sansation',
                  fontSize: 16,
                  fontWeight: FontWeight.w400,
                  height: 1,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'STUDENT IDENTITY CARD',
                style: TextStyle(
                  color: Colors.white,
                  fontFamily: 'Sansation',
                  fontSize: 9,
                  fontWeight: FontWeight.w400,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StudentPhoto extends StatelessWidget {
  final ImageProvider<Object>? photo;

  const _StudentPhoto({this.photo});

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('student-photo'),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: const Color(0xFFD1D5DB)),
        gradient: photo == null
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFFD6E5), Color(0xFFB9DDF6)],
              )
            : null,
        image: photo == null
            ? null
            : DecorationImage(image: photo!, fit: BoxFit.cover),
      ),
      child: photo == null
          ? const Icon(
              Icons.person_outline_rounded,
              color: Colors.white,
              size: 52,
            )
          : null,
    );
  }
}

class _CardDetail extends StatelessWidget {
  final String label;
  final String value;

  const _CardDetail({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF9CA3AF),
            fontFamily: 'Sansation',
            fontSize: 10,
            fontWeight: FontWeight.w400,
            letterSpacing: 0.4,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Color(0xFF111827),
            fontFamily: 'Sansation',
            fontSize: 16,
            fontWeight: FontWeight.w400,
            height: 1.1,
          ),
        ),
      ],
    );
  }
}

class _SecurityPattern extends StatelessWidget {
  const _SecurityPattern();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List<Widget>.generate(
        30,
        (_) => const Expanded(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              '›',
              style: TextStyle(
                color: Color(0xFF4B5563),
                fontSize: 10,
                height: 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
