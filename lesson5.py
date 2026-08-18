name = input("What is your name?")
score = int(input("Enter your score:"))
if score >= 70:
    remark = "Excellent!" 
    grade = "A"
elif score >= 60:
    remark = "Very good!"
    grade = "B"
elif score >= 50:
    remark = "Good!"
    grade = "C"
else:
    remark = "Keep practicing"
    grade = F
print(f"{name}, you scored {score}. {remark} Grade {grade}")