import 'package:flutter/material.dart';

class BusyDay extends StatefulWidget {
  const BusyDay({super.key});

  @override
  State<BusyDay> createState() => _BusyDayState();
}

class _BusyDayState extends State<BusyDay> {
  final List<Map<String, String>> items = [];

  Future<void> _showAddDialog() async {
    String day = "Monday";
    TimeOfDay? startTime;
    TimeOfDay? endTime;

    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("เพิ่มเวลาไม่ว่าง"),
          content: StatefulBuilder(
            builder: (context, setDialogState) {
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [

                  DropdownButtonFormField<String>(
                    value: day,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(20),
                      ),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: "Monday",
                        child: Text("Monday"),
                      ),
                      DropdownMenuItem(
                        value: "Tuesday",
                        child: Text("Tuesday"),
                      ),
                      DropdownMenuItem(
                        value: "Wednesday",
                        child: Text("Wednesday"),
                      ),
                      DropdownMenuItem(
                        value: "Thursday",
                        child: Text("Thursday"),
                      ),
                      DropdownMenuItem(
                        value: "Friday",
                        child: Text("Friday"),
                      ),
                      DropdownMenuItem(
                        value: "Saturday",
                        child: Text("Saturday"),
                      ),
                      DropdownMenuItem(
                        value: "Sunday",
                        child: Text("Sunday"),
                      ),
                    ],
                    onChanged: (value) {
                      setDialogState(() {
                        day = value!;
                      });
                    },
                  ),

                  const SizedBox(height: 12),

                  ElevatedButton(
                    onPressed: () async {
                      final result =
                          await showTimePicker(
                        context: context,
                        initialTime:
                            TimeOfDay.now(),
                      );

                      if (result != null) {
                        setDialogState(() {
                          startTime = result;
                        });
                      }
                    },
                    child: Text(
                      startTime == null
                          ? "เลือกเวลาเริ่ม"
                          : startTime!
                              .format(context),
                    ),
                  ),

                  const SizedBox(height: 10),

                  ElevatedButton(
                    onPressed: () async {
                      final result =
                          await showTimePicker(
                        context: context,
                        initialTime:
                            TimeOfDay.now(),
                      );

                      if (result != null) {
                        setDialogState(() {
                          endTime = result;
                        });
                      }
                    },
                    child: Text(
                      endTime == null
                          ? "เลือกเวลาสิ้นสุด"
                          : endTime!
                              .format(context),
                    ),
                  ),
                ],
              );
            },
          ),
          actions: [
            TextButton(
              onPressed: () =>
                  Navigator.pop(context),
              child: const Text("ยกเลิก"),
            ),
            ElevatedButton(
              onPressed: () {
                if (startTime != null &&
                    endTime != null) {
                  setState(() {
                    items.add({
                      "day": day,
                      "start":
                          startTime!.format(
                              context),
                      "end":
                          endTime!.format(
                              context),
                    });
                  });

                  Navigator.pop(context);
                }
              },
              child: const Text("บันทึก"),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [

        const Text(
          "วันเวลาไม่ว่างประจำ",
          style: TextStyle(
            fontSize: 16,
          ),
        ),

        const SizedBox(height: 12),

        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(
              color: Colors.grey.shade300,
            ),
            borderRadius:
                BorderRadius.circular(20),
          ),
          child: items.isEmpty
              ? const Text(
                  "ยังไม่มีข้อมูล",
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                )
              : Column(
                  children: items.map((item) {
                    return Padding(
                      padding:
                          const EdgeInsets.only(
                        bottom: 10,
                      ),
                      child: Row(
                        children: [

                          Container(
                            width: 8,
                            height: 8,
                            decoration:
                                const BoxDecoration(
                              color: Color(
                                0xFF9CC5F9,
                              ),
                              shape:
                                  BoxShape.circle,
                            ),
                          ),

                          const SizedBox(
                              width: 10),

                          Expanded(
                            child: Text(
                              item["day"]!,
                            ),
                          ),

                          Text(
                            "${item["start"]} - ${item["end"]}",
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
        ),

        const SizedBox(height: 20),

        Center(
          child: SizedBox(
            width: 120,
            height: 42,
            child: ElevatedButton(
              onPressed: _showAddDialog,
              style:
                  ElevatedButton.styleFrom(
                backgroundColor:
                    const Color(
                  0xFFAED8F5,
                ),
                shape:
                    RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(
                    30,
                  ),
                ),
              ),
              child: const Icon(
                Icons.add,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}