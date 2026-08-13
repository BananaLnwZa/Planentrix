import 'package:flutter/material.dart';

enum StudentPopupPanel { profile, constraint }

Future<void> showStudentCardPopup(
  BuildContext context, {
  required String name,
  required String studentNumber,
  String gender = '—',
  String major = 'COMSCI',
  String year = '—',
  String birthDate = '—',
  String dayOff = '—',
  String workingDuration = '—',
  String breakDuration = '—',
  String workingTime = '—',
  List<String> busyTimes = const <String>[],
  ImageProvider<Object>? photo,
  VoidCallback? onEditProfile,
  VoidCallback? onDeleteProfile,
  Future<void> Function()? onLogout,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: Colors.black38,
    builder: (context) {
      return StudentCardPopup(
        name: name,
        studentNumber: studentNumber,
        gender: gender,
        major: major,
        year: year,
        birthDate: birthDate,
        dayOff: dayOff,
        workingDuration: workingDuration,
        breakDuration: breakDuration,
        workingTime: workingTime,
        busyTimes: busyTimes,
        photo: photo,
        onEditProfile: onEditProfile,
        onDeleteProfile: onDeleteProfile,
        onLogout: onLogout,
      );
    },
  );
}

class StudentCardPopup extends StatefulWidget {
  final String name;
  final String studentNumber;
  final String gender;
  final String major;
  final String year;
  final String birthDate;
  final String dayOff;
  final String workingDuration;
  final String breakDuration;
  final String workingTime;
  final List<String> busyTimes;
  final ImageProvider<Object>? photo;
  final VoidCallback? onEditProfile;
  final VoidCallback? onDeleteProfile;
  final Future<void> Function()? onLogout;

  const StudentCardPopup({
    super.key,
    required this.name,
    required this.studentNumber,
    this.gender = '—',
    this.major = 'COMSCI',
    this.year = '—',
    this.birthDate = '—',
    this.dayOff = '—',
    this.workingDuration = '—',
    this.breakDuration = '—',
    this.workingTime = '—',
    this.busyTimes = const <String>[],
    this.photo,
    this.onEditProfile,
    this.onDeleteProfile,
    this.onLogout,
  });

  @override
  State<StudentCardPopup> createState() => _StudentCardPopupState();
}

class _StudentCardPopupState extends State<StudentCardPopup> {
  StudentPopupPanel _activePanel = StudentPopupPanel.profile;
  bool _isLoggingOut = false;

  Future<void> _logout() async {
    final action = widget.onLogout;
    if (action == null || _isLoggingOut) return;

    setState(() {
      _isLoggingOut = true;
    });

    Navigator.of(context).pop();
    await action();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.sizeOf(context).height;

    return Dialog(
      key: const Key('student-card-popup'),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 480,
          maxHeight: screenHeight * 0.9,
        ),
        child: Material(
          color: const Color(0xFFF3FBFF),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFFD1D5DB)),
          ),
          clipBehavior: Clip.antiAlias,
          elevation: 18,
          child: Column(
            children: [
              _PopupHeader(
                name: widget.name,
                studentNumber: widget.studentNumber,
                photo: widget.photo,
                onClose: () => Navigator.of(context).pop(),
                onEditProfile: widget.onEditProfile,
                onDeleteProfile: widget.onDeleteProfile,
              ),
              _PopupTabs(
                activePanel: _activePanel,
                onChanged: (panel) {
                  setState(() {
                    _activePanel = panel;
                  });
                },
              ),
              Expanded(
                child: SingleChildScrollView(
                  key: const Key('student-popup-scroll'),
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
                  child: _activePanel == StudentPopupPanel.profile
                      ? _ProfilePanel(
                          name: widget.name,
                          birthDate: widget.birthDate,
                          gender: widget.gender,
                        )
                      : _ConstraintPanel(
                          dayOff: widget.dayOff,
                          workingDuration: widget.workingDuration,
                          breakDuration: widget.breakDuration,
                          workingTime: widget.workingTime,
                          busyTimes: widget.busyTimes,
                        ),
                ),
              ),
              _PopupFooter(
                isLoggingOut: _isLoggingOut,
                onLogout: widget.onLogout == null ? null : _logout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PopupHeader extends StatelessWidget {
  final String name;
  final String studentNumber;
  final ImageProvider<Object>? photo;
  final VoidCallback onClose;
  final VoidCallback? onEditProfile;
  final VoidCallback? onDeleteProfile;

  const _PopupHeader({
    required this.name,
    required this.studentNumber,
    required this.photo,
    required this.onClose,
    required this.onEditProfile,
    required this.onDeleteProfile,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFC7E8F8),
      padding: const EdgeInsets.fromLTRB(20, 24, 12, 18),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 28),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ProfilePhoto(photo: photo),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        key: const Key('student-popup-name'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.black,
                          fontFamily: 'Sansation',
                          fontSize: 30,
                          fontWeight: FontWeight.w400,
                          height: 1.05,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'ID $studentNumber',
                        style: const TextStyle(
                          color: Color(0xFF526773),
                          fontFamily: 'Sansation',
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _HeaderAction(
                        key: const Key('edit-profile-button'),
                        icon: Icons.edit_outlined,
                        label: 'Edit Profile',
                        onPressed: onEditProfile,
                      ),
                      const SizedBox(height: 4),
                      _HeaderAction(
                        key: const Key('delete-profile-button'),
                        icon: Icons.delete_outline,
                        label: 'Delete Profile',
                        onPressed: onDeleteProfile,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            right: 0,
            child: IconButton(
              key: const Key('close-student-popup'),
              tooltip: 'Close profile',
              onPressed: onClose,
              icon: const Icon(Icons.close_rounded, size: 28),
              color: const Color(0xFF314553),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfilePhoto extends StatelessWidget {
  final ImageProvider<Object>? photo;

  const _ProfilePhoto({this.photo});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 104,
      height: 104,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
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
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
        ],
      ),
      child: photo == null
          ? const Icon(
              Icons.person_outline_rounded,
              color: Colors.white,
              size: 56,
            )
          : null,
    );
  }
}

class _HeaderAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  const _HeaderAction({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: onPressed == null
                  ? const Color(0x80314553)
                  : const Color(0xFF314553),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: onPressed == null
                      ? const Color(0x80314553)
                      : const Color(0xFF314553),
                  fontFamily: 'Sansation',
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PopupTabs extends StatelessWidget {
  final StudentPopupPanel activePanel;
  final ValueChanged<StudentPopupPanel> onChanged;

  const _PopupTabs({required this.activePanel, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFC7E8F8),
      child: Row(
        children: [
          Expanded(
            child: _TabButton(
              key: const Key('profile-tab'),
              icon: Icons.person_outline_rounded,
              label: 'Profile',
              isActive: activePanel == StudentPopupPanel.profile,
              onTap: () => onChanged(StudentPopupPanel.profile),
            ),
          ),
          Expanded(
            child: _TabButton(
              key: const Key('constraint-tab'),
              icon: Icons.menu_book_outlined,
              label: 'Constraint',
              isActive: activePanel == StudentPopupPanel.constraint,
              onTap: () => onChanged(StudentPopupPanel.constraint),
            ),
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _TabButton({
    super.key,
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isActive ? const Color(0xFFF3FBFF) : const Color(0xFFE5E7EB),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
        child: SizedBox(
          height: 44,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 20, color: const Color(0xFF314553)),
                const SizedBox(width: 6),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      label,
                      maxLines: 1,
                      style: const TextStyle(
                        color: Color(0xFF314553),
                        fontFamily: 'Sansation',
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
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

class _ProfilePanel extends StatelessWidget {
  final String name;
  final String birthDate;
  final String gender;

  const _ProfilePanel({
    required this.name,
    required this.birthDate,
    required this.gender,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('profile-panel'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ProfileInfoCard(label: 'ชื่อผู้ใช้', value: name),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _ProfileInfoCard(label: 'วันเกิด', value: birthDate),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ProfileInfoCard(label: 'เพศ', value: gender),
            ),
          ],
        ),
      ],
    );
  }
}

class _ConstraintPanel extends StatelessWidget {
  final String dayOff;
  final String workingDuration;
  final String breakDuration;
  final String workingTime;
  final List<String> busyTimes;

  const _ConstraintPanel({
    required this.dayOff,
    required this.workingDuration,
    required this.breakDuration,
    required this.workingTime,
    required this.busyTimes,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('constraint-panel'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _ConstraintRow(label: 'วันหยุด', value: dayOff),
        _ConstraintRow(label: 'ระยะเวลาทำงาน', value: workingDuration),
        _ConstraintRow(label: 'ระยะเวลาพัก', value: breakDuration),
        _ConstraintRow(label: 'เวลาทำงาน', value: workingTime),
        const SizedBox(height: 12),
        const Text(
          'วันเวลาไม่ว่างประจำ',
          style: TextStyle(
            color: Color(0xFF374151),
            fontFamily: 'Sansation',
            fontSize: 14,
            fontWeight: FontWeight.w400,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFD1D5DB)),
          ),
          child: busyTimes.isEmpty
              ? const Text(
                  'ไม่มีวันเวลาไม่ว่างประจำ',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontFamily: 'Sansation',
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: busyTimes
                      .map(
                        (time) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Text(
                            time,
                            style: const TextStyle(
                              color: Color(0xFF374151),
                              fontFamily: 'Sansation',
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
        ),
      ],
    );
  }
}

class _ProfileInfoCard extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileInfoCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 76),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xCCFFFFFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF374151),
              fontFamily: 'Sansation',
              fontSize: 14,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF314553),
              fontFamily: 'Sansation',
              fontSize: 16,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }
}

class _ConstraintRow extends StatelessWidget {
  final String label;
  final String value;

  const _ConstraintRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF4B5563),
                fontFamily: 'Sansation',
                fontSize: 13,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFD1D5DB)),
              ),
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  color: Color(0xFF374151),
                  fontFamily: 'Sansation',
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PopupFooter extends StatelessWidget {
  final bool isLoggingOut;
  final VoidCallback? onLogout;

  const _PopupFooter({required this.isLoggingOut, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xB3FFFFFF),
        border: Border(top: BorderSide(color: Color(0xFFD9E7EE))),
      ),
      child: Center(
        child: OutlinedButton.icon(
          key: const Key('popup-logout-button'),
          onPressed: isLoggingOut ? null : onLogout,
          icon: isLoggingOut
              ? const SizedBox(
                  width: 17,
                  height: 17,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.logout_rounded, size: 19),
          label: Text(isLoggingOut ? 'Logging out...' : 'Log out'),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFE65D84),
            side: const BorderSide(color: Color(0xFFF19AB3)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(25),
            ),
            textStyle: const TextStyle(
              fontFamily: 'Sansation',
              fontSize: 14,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }
}
