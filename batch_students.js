const fs = require("fs");
let students_reg = JSON.parse(fs.readFileSync("students-reg.json", "utf-8"));
let mathced_students = JSON.parse(
  fs.readFileSync("SeminarAssignments.json", "utf-8")
);
let all_students_profiles = JSON.parse(
  fs.readFileSync("Student-Profiles.json", "utf-8")
);
let { current_seminars_targetGrade } = require("./info_func");
const { uuid } = require("uuidv4");
let late_reg = JSON.parse(fs.readFileSync("late_reg.json", "utf-8"));

//============================Data Joining===========================//
const joined_students_info = students_reg.map((student) => {
  const { email, numSeminars, sem1, sem2, sem3, sem4, sem5, createdAt } =
    student;

  //Find registered students' grade from Student-Profiles.json
  const level = all_students_profiles.filter((complete_profile) => {
    const { email: profileEmail, grade: studentGrade } = complete_profile;

    if (email === profileEmail) {
      return studentGrade;
    }
  });

  const grade = level[0]?.grade || "9";
  const parentEmail = level[0]?.parentEmail || "";
  const studentFirstName = level[0]?.first_name || "";
  const studentSecondName = level[0]?.last_name || "";
  const studentName = `${studentFirstName} ${studentSecondName}`;
  const id = uuid();

  // turn the seminar properties into a map, eliminate repeat courses
  const registered = new Map();
  const courseArr = [sem1, sem2, sem3, sem4, sem5];
  const removedSeminar = ["seminar999"];

  courseArr.forEach((seminar) => {
    if (seminar && !removedSeminar.includes(seminar)) {
      registered.set(seminar, false);
    }
  });

  return {
    id,
    studentName,
    email,
    parentEmail,
    grade,
    numSeminars,
    registered,
    createdAt,
  };
});

//============================Data Cleaning===========================//

const students_with_no_repeat_account = (JoinedStudentInfo) => {
  function findRepeatAccount(repeatedAccounts = []) {
    const allStuEmailset = new Set();
    const allStuEmails = JoinedStudentInfo.map(({ email, id }) => {
      allStuEmailset.add(email);
      return { email, id };
    });

    while (allStuEmails.length !== 0) {
      const accountInstance = allStuEmails.pop();
      if (!allStuEmailset.delete(accountInstance.email)) {
        repeatedAccounts.push(accountInstance);
      }
    }

    return repeatedAccounts;
  }

  function deleteRepeatAccount(repeatedAccounts, joinedStudentsInfo) {
    return joinedStudentsInfo.filter((Student) => {
      const { id: repeatedId } = Student;
      return !repeatedAccounts.includes(repeatedId);
    });
  }

  const repeatAccount = findRepeatAccount();

  return deleteRepeatAccount(repeatAccount, JoinedStudentInfo);
};

//find + delete repeat course regisration

// const students_with_no_repeat_courese = (studentRegInfo) => {
//   let repeat_reg = [];
//   let repeat_reg_num = 0;
//   studentRegInfo.forEach((Student) => {
//     const { sem1, sem2, sem3, sem4, sem5 } = Student;
//     const courseArr = [sem1, sem2, sem3, sem4, sem5];
//     const courseSet = new Set();
//     courseArr.forEach((course) => courseSet.add(course));

//     courseArr.forEach((sem) => {
//       let repeats = 0;
//       courseArr.forEach((sem_compare) => {
//         if (sem === sem_compare && sem !== "") {
//           repeats++;
//           if (repeats > 1) {
//             repeat_reg_num++;
//             repeat_reg.push(email);
//           }
//         }
//       });
//     });
//   });
//   console.log(repeat_reg);
//   console.log(repeat_reg_num / 2 + " student registered repeat courses");
// };

function sortByRegTimeCallback(a, b) {
  var date1 = new Date(Date.parse(a.createdAt));
  var date2 = new Date(Date.parse(b.createdAt));
  if (date1.getTime() >= date2.getTime()) {
    return 1;
  } else if (date1.getTime() <= date2.getTime()) {
    return -1;
  } else {
    return 0;
  }
}

const conflictTimeCoursesParis = [
  ["seminar136", "seminar131"],
  ["seminar135", "seminar140"],
  ["seminar125", "seminar135"],
  ["seminar134", "seminar138"],
  ["seminar134", "seminar127"],
];

function clearStuWhoChooseTimeConflictCourse_helper(arr, seminar1, seminar2) {
  let sem1 = arr.indexOf(seminar1);
  let sem2 = arr.indexOf(seminar2);
  if (sem1 !== -1 && sem2 !== -1) {
    if (sem1 > sem2) {
      arr[sem2] = "";
      moveBackEmptyCourseChoice(arr);
    } else {
      arr[sem1] = "";
      moveBackEmptyCourseChoice(arr);
    }
  }
}

function moveBackEmptyCourseChoice(arr) {
  let emp = arr.indexOf("");
  while (emp < 4 && arr[emp + 1] !== "") {
    arr[emp] = arr[emp + 1];
    arr[emp + 1] = "";
    emp++;
  }
}
function clearStuWhoChooseTimeConflictCourse(arr, allConflictsPairs) {
  for (let i = 0; i < conflictTimeCoursesParis.length; i++) {
    clearStuWhoChooseTimeConflictCourse_helper(
      arr,
      allConflictsPairs[i][0],
      allConflictsPairs[i][1]
    );
  }
  return arr;
}
//let test = 0;

function sortRegistrationByGrade(grade, arr) {
  const returnArr = [];
  const sortByGrade = [];
  current_seminars_targetGrade.forEach((seminar) => {
    arr.forEach((stu_choice) => {
      if (seminar[0] === stu_choice) {
        const gap = filterRegistrationByGrade(seminar[1], grade);
        if (gap !== "match") {
          sortByGrade.push([seminar[0], gap]);
        } else {
          returnArr.push(seminar[0]);
        }
      }
    });
  });
  const finishedSorting = sortByGrade.sort((a, b) => {
    b[1] - a[1];
  });

  finishedSorting.forEach((e) => {
    returnArr.push(e[0]);
  });
  return returnArr;
}

function filterRegistrationByGrade(target, grade, gradeline = 0) {
  let min = 12;
  let max = 6;
  target.forEach((t) => {
    if (t < min) {
      min = t;
    }
    if (t > max) {
      max = t;
    }
  });
  if (grade.charAt(0) !== ">" || grade.charAt(0) !== "<") {
    if (grade <= max + gradeline && grade >= min - gradeline) {
      return "match";
    } else if (grade > max) {
      return grade - max;
    } else if (grade < min) {
      return min - grade;
    }
    if (grade.charAt(0) == ">") {
      if (max + gradeline >= 12) {
        return "match";
      } else {
        return 12 - max;
      }
    }

    if (grade.charAt(0) == "<") {
      if (min - gradeline <= 6) {
        return "match";
      } else {
        return min - 6;
      }
    }
  }
}
function setRegistered({ grade, registered }) {
  const sortedRegisteredbyGrade = sortRegistrationByGrade(grade, registered);
  return clearStuWhoChooseTimeConflictCourse(
    sortedRegisteredbyGrade,
    conflictTimeCoursesParis
  );
}

const packagedStudentInfo = (student) => {
  const { id, studentName, parentEmail, email, createdAt, grade, numSeminars } =
    student;

  let registered = setRegistered(student);

  return {
    id,
    studentName,
    email,
    parentEmail,
    createdAt,
    grade,
    numSeminars,
    registered,
  };
};

const batchStudentByNumSeminar = (regisrationData) => {
  const batches = [];
  for (let index = 1; index < 6; index++) {
    batches.push(
      regisrationData
        .map((student) => {
          return packagedStudentInfo(student);
        })
        .filter(({ registered }) => {
          return registered.size == index;
        })
        .sort(sortByRegTimeCallback)
    );
  }
  return batches;
};

function filterStudentByCourse(seminar1, seminar2) {
  let studentChooseConflicTimeCourses = [];
  batches.forEach((subGroup) => {
    subGroup.forEach((student) => {
      if (
        student.registered.has(seminar1) &&
        student.registered.has(seminar2)
      ) {
        const return_object = [student, seminar1, seminar2];
        studentChooseConflicTimeCourses.push(return_object);
      }
    });
  });
  return studentChooseConflicTimeCourses;
}

const numStuChooseTCC = conflictTimeCoursesParis.reduce((total, pair) => {
  return total + filterStudentByCourse(pair[0], pair[1]).length;
}, 0);

const StuChooseTCC = () =>
  conflictTimeCoursesParis.forEach((pair) => {
    console.log(filterStudentByCourse(pair[0], pair[1]));
  });
//console.log(filterStudentByCourse("seminar136", "seminar131").length);
exports.stu_batches = batches;
console.log("=============");
console.log(students_reg.length + "total students");
console.log(late_reg.length + "late reg");

let temp_batches = batches;
//console.log(temp_batches);
let waitListedStudent = [];
temp_batches.forEach((Subgroup) => {
  Subgroup.forEach((Student) => {
    const { email, registered, studentName } = Student;

    mathced_students.forEach((MStudent) => {
      const { student, waitlisted, seminar } = MStudent;
      let Memail = student;

      if (Memail == email && waitlisted && registered.size > 1) {
        registered.delete(seminar);

        let mapIter = registered.entries();
        let secondSeminar = mapIter.next().value[0];

        waitListedStudent.push({ studentName, email, secondSeminar });
      }
    });
  });
});

// console.log(waitListedStudent.length);

// fs.writeFile(
//   "waitlistedStudentsWithSecSeminar.json",
//   JSON.stringify(waitListedStudent),
//   "utf8",
//   (err) => {
//     if (err) console.log(err);
//     else {
//       console.log("File written successfully\n");
//     }
//   }
// );
//{"id":"c3057621-0017-40b2-9943-22111868e335","seminar":"seminar138","waitlisted":false,"parentEmail":"minmou@gmail.com","student":"minmou@gmail.com","absences":null},
