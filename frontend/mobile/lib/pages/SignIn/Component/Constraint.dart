import 'package:flutter/material.dart';
import 'WorkTime.dart';
import 'BusyDay.dart';

class Constraint extends StatelessWidget {
  const Constraint({super.key});

  @override
  Widget build(BuildContext context) {
    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(
        color: Color(0xFFCFCFCF),
      ),
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.92),
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          /// TITLE
          const Center(
            child: Text(
              "Constraint",
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          const SizedBox(height: 30),

          /// วันหยุด
          const Text(
            "วันหยุด",
            style: TextStyle(fontSize: 16),
          ),

          const SizedBox(height: 8),

          SizedBox(
            width: 200,
            child: DropdownButtonFormField<String>(
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                enabledBorder: inputBorder,
                focusedBorder: inputBorder,
              ),
              hint: const Text("เลือกวันที่ต้องการหยุด"),
              items: const [
                DropdownMenuItem(
                  value: "Mon",
                  child: Text("Monday"),
                ),
                DropdownMenuItem(
                  value: "Tue",
                  child: Text("Tuesday"),
                ),
                DropdownMenuItem(
                  value: "Wed",
                  child: Text("Wednesday"),
                ),
              ],
              onChanged: (value) {},
            ),
          ),

          const SizedBox(height: 24),

          /// ระยะเวลาทำงานต่อเนื่อง
          const Text(
            "ระยะเวลาทำงานต่อเนื่อง",
            style: TextStyle(fontSize: 16),
          ),

          const SizedBox(height: 8),

          Row(
            children: [
              SizedBox(
                width: 50,
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: inputBorder,
                  ),
                ),
              ),

              const SizedBox(width: 8),
              const Text("ชม."),

              const SizedBox(width: 16),

              SizedBox(
                width: 50,
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: inputBorder,
                  ),
                ),
              ),

              const SizedBox(width: 8),
              const Text("นาที"),
            ],
          ),

          const SizedBox(height: 24),

          /// ระยะเวลาพัก
          const Text(
            "ระยะเวลาพัก",
            style: TextStyle(fontSize: 16),
          ),

          const SizedBox(height: 8),

          Row(
            children: [
              SizedBox(
                width: 50,
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: inputBorder,
                  ),
                ),
              ),

              const SizedBox(width: 8),
              const Text("ชม."),

              const SizedBox(width: 16),

              SizedBox(
                width: 50,
                child: TextField(
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    border: inputBorder,
                    enabledBorder: inputBorder,
                    focusedBorder: inputBorder,
                  ),
                ),
              ),

              const SizedBox(width: 8),
              const Text("นาที"),
            ],
          ),

          const SizedBox(height: 24),

          /// เวลาเริ่มทำงาน
          const Text(
            "เวลาเริ่มการทำงาน",
            style: TextStyle(fontSize: 16),
          ),

          const SizedBox(height: 8),

          SizedBox(
            width: 140,
            child: TextField(
              readOnly: true,
              decoration: InputDecoration(
                hintText: "select time",
                enabledBorder: inputBorder,
                focusedBorder: inputBorder,
              ),
            ),
          ),

          const SizedBox(height: 24),

          /// เวลาสิ้นสุด
          const Text(
            "เวลาสิ้นสุดการทำงาน",
            style: TextStyle(fontSize: 16),
          ),

          const SizedBox(height: 8),

          SizedBox(
            width: 140,
            child: TextField(
              readOnly: true,
              decoration: InputDecoration(
                hintText: "select time",
                enabledBorder: inputBorder,
                focusedBorder: inputBorder,
              ),
            ),
          ),

          const SizedBox(height: 30),

          /// ช่วงเช้า กลางวัน เย็น
          const WorkTime(),

          const SizedBox(height: 24),

          /// วันไม่ว่างประจำ
          const BusyDay(),
        ],
      ),
    );
  }
}