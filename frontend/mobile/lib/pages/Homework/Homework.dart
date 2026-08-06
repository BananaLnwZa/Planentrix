import 'package:flutter/material.dart';

import '../../common/NotebookSectionPage.dart';
import '../../common/NotebookTabs.dart';

class HomeworkPage extends StatelessWidget {
  const HomeworkPage({super.key});

  static const _groups = [
    _HomeworkGroupData(
      title: 'ส่งพรุ่งนี้',
      color: Color(0xFFFFEE9C),
      borderColor: Color(0xFFD9CB86),
      spacingAfter: 13,
      tasks: [
        _HomeworkTaskData(
          subject: 'Numerical Method',
          assignment: 'แบบฝึกหัด 2',
          dueDate: '4/5/2569',
          dueTime: '5:00 PM',
        ),
      ],
    ),
    _HomeworkGroupData(
      title: '12 มี.ค 2569',
      color: Color(0xFFD7F2B6),
      borderColor: Color(0xFFA5BE85),
      spacingAfter: 18,
      tasks: [
        _HomeworkTaskData(
          subject: 'Web Programing',
          assignment: 'แบบฝึกหัด 1',
          dueDate: '12/5/2569',
          dueTime: '5:00 PM',
        ),
        _HomeworkTaskData(
          subject: 'Numerical Method',
          assignment: 'แบบฝึกหัด 4',
          dueDate: '12/5/2569',
          dueTime: '5:00 PM',
        ),
      ],
    ),
    _HomeworkGroupData(
      title: '16 มี.ค 2569',
      color: Color(0xFFD7F2B6),
      borderColor: Color(0xFFA5BE85),
      spacingAfter: 18,
      tasks: [
        _HomeworkTaskData(
          subject: 'Numerical Method',
          assignment: 'แบบฝึกหัด 5',
          dueDate: '16/5/2569',
          dueTime: '5:00 PM',
        ),
      ],
    ),
    _HomeworkGroupData(
      title: 'ล่าช้า',
      color: Color(0xFFFFCED5),
      borderColor: Color(0xFFE5A4AE),
      tasks: [
        _HomeworkTaskData(
          subject: 'Numerical Method',
          assignment: 'แบบฝึกหัด 1',
          dueDate: '2/5/2569',
          dueTime: '3:00 PM',
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return const NotebookSectionPage(
      activeTab: NotebookTabId.homework,
      contentKey: Key('homework-page'),
      centerContent: false,
      child: _HomeworkContent(groups: _groups),
    );
  }
}

class _HomeworkContent extends StatelessWidget {
  final List<_HomeworkGroupData> groups;

  const _HomeworkContent({required this.groups});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = constraints.maxWidth / 319;
        return Padding(
          padding: EdgeInsets.only(top: 19 * scale, bottom: 24 * scale),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: EdgeInsets.only(left: 23 * scale),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: _AddHomeworkButton(scale: scale),
                ),
              ),
              SizedBox(height: 23 * scale),
              for (var index = 0; index < groups.length; index++)
                _HomeworkGroup(index: index, data: groups[index], scale: scale),
            ],
          ),
        );
      },
    );
  }
}

class _AddHomeworkButton extends StatelessWidget {
  final double scale;

  const _AddHomeworkButton({required this.scale});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'เพิ่มงาน',
      child: Container(
        key: const Key('homework-add-button'),
        width: 60 * scale,
        height: 25 * scale,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12 * scale),
          border: Border.all(
            color: const Color(0xFFE29DC7),
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
            onTap: () {},
            borderRadius: BorderRadius.circular(12 * scale),
            child: Center(
              child: Text(
                'เพิ่มงาน',
                style: TextStyle(
                  color: const Color(0xFFE29DC7),
                  fontSize: 12 * scale,
                  height: 1,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeworkGroup extends StatelessWidget {
  final int index;
  final _HomeworkGroupData data;
  final double scale;

  const _HomeworkGroup({
    required this.index,
    required this.data,
    required this.scale,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            key: Key('homework-group-$index'),
            width: 72 * scale,
            height: 21 * scale,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: data.color,
              borderRadius: BorderRadius.horizontal(
                right: Radius.circular(8 * scale),
              ),
              border: Border(
                top: BorderSide(color: data.borderColor, width: scale),
                right: BorderSide(color: data.borderColor, width: scale),
                bottom: BorderSide(color: data.borderColor, width: scale),
              ),
            ),
            child: Text(
              data.title,
              maxLines: 1,
              style: TextStyle(
                color: const Color(0xB3000000),
                fontSize: 10 * scale,
                height: 1,
              ),
            ),
          ),
        ),
        SizedBox(height: 6 * scale),
        for (var taskIndex = 0; taskIndex < data.tasks.length; taskIndex++) ...[
          Padding(
            padding: EdgeInsets.only(left: 23 * scale, right: 22 * scale),
            child: _HomeworkTaskCard(
              key: Key('homework-task-$index-$taskIndex'),
              task: data.tasks[taskIndex],
              scale: scale,
            ),
          ),
          if (taskIndex < data.tasks.length - 1) SizedBox(height: 11 * scale),
        ],
        if (data.spacingAfter > 0) SizedBox(height: data.spacingAfter * scale),
      ],
    );
  }
}

class _HomeworkTaskCard extends StatelessWidget {
  final _HomeworkTaskData task;
  final double scale;

  const _HomeworkTaskCard({super.key, required this.task, required this.scale});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 35 * scale,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8 * scale),
        border: Border.all(color: const Color(0x4D000000), width: scale),
        boxShadow: [
          BoxShadow(
            color: const Color(0x40000000),
            blurRadius: 3 * scale,
            offset: Offset(1 * scale, 1 * scale),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return Stack(
            children: [
              Positioned(
                left: width * 0.0438,
                top: 14 * scale,
                width: width * 0.36,
                child: _CardText(task.subject, fontSize: 8 * scale),
              ),
              Positioned(
                left: width * 0.4234,
                top: 14 * scale,
                width: width * 0.25,
                child: _CardText(task.assignment, fontSize: 8 * scale),
              ),
              Positioned(
                left: width * 0.6934,
                top: 5 * scale,
                width: width * 0.14,
                child: _CardText('กำหนดส่ง', fontSize: 6 * scale),
              ),
              Positioned(
                left: width * 0.6861,
                top: 14 * scale,
                width: width * 0.15,
                child: _CardText(task.dueDate, fontSize: 6 * scale),
              ),
              Positioned(
                left: width * 0.6934,
                top: 23 * scale,
                width: width * 0.14,
                child: _CardText(task.dueTime, fontSize: 6 * scale),
              ),
              Positioned(
                left: width * 0.8504,
                top: 10 * scale,
                width: width * 0.1095,
                height: 15 * scale,
                child: _SubmitButton(scale: scale),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CardText extends StatelessWidget {
  final String text;
  final double fontSize;

  const _CardText(this.text, {required this.fontSize});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        color: const Color(0xFF374957),
        fontSize: fontSize,
        height: 1,
      ),
    );
  }
}

class _SubmitButton extends StatelessWidget {
  final double scale;

  const _SubmitButton({required this.scale});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'ส่งงาน',
      child: Material(
        color: const Color(0xFFCFEFFF),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8 * scale),
          side: BorderSide(color: const Color(0xFF99B3C0), width: 0.5 * scale),
        ),
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(8 * scale),
          child: Stack(
            children: [
              Positioned(
                left: 7 * scale,
                top: 3 * scale,
                child: Text(
                  'ส่ง',
                  style: TextStyle(
                    color: const Color(0xFF374957),
                    fontSize: 8 * scale,
                    height: 1,
                  ),
                ),
              ),
              Positioned(
                left: 18 * scale,
                top: 5 * scale,
                child: Image.asset(
                  'assets/icons/homework_check.png',
                  width: 6 * scale,
                  height: 6 * scale,
                  fit: BoxFit.contain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeworkGroupData {
  final String title;
  final Color color;
  final Color borderColor;
  final double spacingAfter;
  final List<_HomeworkTaskData> tasks;

  const _HomeworkGroupData({
    required this.title,
    required this.color,
    required this.borderColor,
    this.spacingAfter = 0,
    required this.tasks,
  });
}

class _HomeworkTaskData {
  final String subject;
  final String assignment;
  final String dueDate;
  final String dueTime;

  const _HomeworkTaskData({
    required this.subject,
    required this.assignment,
    required this.dueDate,
    required this.dueTime,
  });
}
