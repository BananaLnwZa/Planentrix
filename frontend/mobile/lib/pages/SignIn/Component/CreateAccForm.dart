import 'package:flutter/material.dart';

class CreateAccForm extends StatelessWidget {
  const CreateAccForm({super.key});

  @override
  Widget build(BuildContext context) {
    final inputBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(25),
      borderSide: const BorderSide(
        color: Color(0xFFBDBDBD),
        width: 1,
      ),
    );

    Widget buildLabel(String text) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              color: Color(0xFF333333),
            ),
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: 36,
        vertical: 40,
      ),
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
          const Center(
            child: Text(
              "Create Account",
              style: TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w500,
                color: Colors.black,
              ),
            ),
          ),

          const SizedBox(height: 40),

          /// username
          buildLabel("username"),

          TextField(
            decoration: InputDecoration(
              hintText: "enter username",
              hintStyle: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 15,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 16,
              ),
              enabledBorder: inputBorder,
              focusedBorder: inputBorder,
            ),
          ),

          const SizedBox(height: 26),

          /// password
          buildLabel("password"),

          TextField(
            obscureText: true,
            decoration: InputDecoration(
              hintText: "enter password",
              hintStyle: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 15,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 16,
              ),
              enabledBorder: inputBorder,
              focusedBorder: inputBorder,
            ),
          ),

          const SizedBox(height: 26),

          /// confirm password
          buildLabel("confirm password"),

          TextField(
            obscureText: true,
            decoration: InputDecoration(
              hintText: "enter to confirm password",
              hintStyle: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 15,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 16,
              ),
              enabledBorder: inputBorder,
              focusedBorder: inputBorder,
            ),
          ),

          const SizedBox(height: 26),

          /// birth date
          buildLabel("birth date"),

          SizedBox(
            width: 230,
            child: TextField(
              decoration: InputDecoration(
                hintText: "dd/mm/yyyy",
                hintStyle: TextStyle(
                  color: Colors.grey.shade400,
                  fontSize: 15,
                ),

                /// ใส่ icon ของนายตรงนี้
                suffixIcon: const SizedBox(),

                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                enabledBorder: inputBorder,
                focusedBorder: inputBorder,
              ),
            ),
          ),

          const SizedBox(height: 26),

          /// gender
          buildLabel("gender"),

          SizedBox(
            width: 230,
            child: DropdownButtonFormField<String>(
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 8,
                ),
                enabledBorder: inputBorder,
                focusedBorder: inputBorder,
              ),
              hint: Text(
                "select gender",
                style: TextStyle(
                  color: Colors.grey.shade400,
                ),
              ),
              items: const [
                DropdownMenuItem(
                  value: "Male",
                  child: Text("Male"),
                ),
                DropdownMenuItem(
                  value: "Female",
                  child: Text("Female"),
                ),
              ],
              onChanged: (value) {},
            ),
          ),
        ],
      ),
    );
  }
}