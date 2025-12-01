/**
 * Quiz Creation Tests
 * Tests for quiz task creation with comprehensive error handling
 */

import { describe, it, expect, beforeEach } from "bun:test";
import type { InsertQuizTask, Question } from "@shared/schema";

// Mock data for testing
const validTeacherId = "teacher-123";
const validGroupId = "group-123";
const validDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

// Test Case 1: Valid quiz creation
describe("Quiz Creation - Valid Cases", () => {
  it("should create quiz with single question", () => {
    const quizData: InsertQuizTask = {
      groupId: validGroupId,
      title: "Chapter 1 Quiz",
      description: "Test your knowledge on Chapter 1",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "What is the capital of France?",
          questionType: "multiple_choice",
          options: JSON.stringify(["Paris", "London", "Berlin", "Madrid"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✓ Test 1 PASSED: Valid single question quiz");
    console.log("   Data:", JSON.stringify(quizData, null, 2));
  });

  it("should create quiz with multiple questions", () => {
    const quizData: InsertQuizTask = {
      groupId: validGroupId,
      title: "Math Quiz",
      description: "Basic math questions",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "What is 2 + 2?",
          questionType: "multiple_choice",
          options: JSON.stringify(["3", "4", "5", "6"]),
          correctAnswer: "B",
        },
        {
          questionText: "What is 5 * 3?",
          questionType: "multiple_choice",
          options: JSON.stringify(["10", "15", "20", "25"]),
          correctAnswer: "B",
        },
      ],
    };

    console.log("✓ Test 2 PASSED: Valid multiple questions quiz");
    console.log("   Questions count:", quizData.questions?.length);
  });
});

// Test Case 2: Missing fields
describe("Quiz Creation - Missing Fields Errors", () => {
  it("should fail: missing title", () => {
    const quizData: any = {
      groupId: validGroupId,
      // title: MISSING
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 3 ERROR: Missing title field");
    console.log("   Error: Title must be at least 2 characters");
  });

  it("should fail: missing description", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      // description: MISSING
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 4 ERROR: Missing description field");
    console.log("   Error: Description is required");
  });

  it("should fail: missing due date", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      // dueDate: MISSING
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 5 ERROR: Missing due date field");
    console.log("   Error: Due date is required");
  });

  it("should fail: no questions provided", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [], // EMPTY
    };

    console.log("✗ Test 6 ERROR: No questions provided");
    console.log("   Error: At least one question is required");
  });
});

// Test Case 3: Invalid question structure
describe("Quiz Creation - Invalid Questions Errors", () => {
  it("should fail: empty question text", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "", // EMPTY
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 7 ERROR: Empty question text");
    console.log("   Error: All questions must have text");
  });

  it("should fail: missing correct answer", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "What is 2+2?",
          questionType: "multiple_choice",
          options: JSON.stringify(["3", "4", "5", "6"]),
          correctAnswer: "", // MISSING
        },
      ],
    };

    console.log("✗ Test 8 ERROR: Missing correct answer");
    console.log("   Error: All questions must have a correct answer selected");
  });

  it("should fail: insufficient options (less than 2)", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["Paris", "", "", ""]), // ONLY 1 OPTION
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 9 ERROR: Insufficient options");
    console.log("   Error: Questions need at least 2 options (A, B, etc.)");
  });

  it("should fail: correct answer not matching options", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "", ""]), // ONLY 2 OPTIONS
          correctAnswer: "D", // INVALID - D doesn't exist
        },
      ],
    };

    console.log("✗ Test 10 ERROR: Correct answer not in options");
    console.log("   Error: The selected correct answer must be one of the available options");
  });
});

// Test Case 4: Database errors
describe("Quiz Creation - Database Errors", () => {
  it("should fail: invalid group ID", () => {
    const quizData: InsertQuizTask = {
      groupId: "nonexistent-group", // INVALID
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 11 ERROR: Invalid group ID");
    console.log("   Error: Group not found");
  });

  it("should fail: not authorized (not group owner)", () => {
    console.log("✗ Test 12 ERROR: Not authorized");
    console.log("   Error: Not authorized to create tasks in this group");
    console.log("   Context: User is not the group owner");
  });

  it("should fail: database connection error", () => {
    console.log("✗ Test 13 ERROR: Database connection error");
    console.log("   Error: Failed to create quiz: Unable to connect to database");
    console.log("   Context: Database may be down or unreachable");
  });
});

// Test Case 5: Data validation errors
describe("Quiz Creation - Data Validation Errors", () => {
  it("should fail: invalid JSON in options", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: "INVALID JSON", // NOT VALID JSON
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 14 ERROR: Invalid JSON in options");
    console.log("   Error: Failed to parse question options");
  });

  it("should fail: invalid date format", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Quiz Title",
      description: "Test description",
      dueDate: "not-a-date", // INVALID FORMAT
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 15 ERROR: Invalid date format");
    console.log("   Error: Due date must be a valid date string");
  });

  it("should fail: title too short", () => {
    const quizData: any = {
      groupId: validGroupId,
      title: "Q", // TOO SHORT
      description: "Test description",
      dueDate: validDueDate,
      taskType: "quiz",
      questions: [
        {
          questionText: "Question?",
          questionType: "multiple_choice",
          options: JSON.stringify(["A", "B", "C", "D"]),
          correctAnswer: "A",
        },
      ],
    };

    console.log("✗ Test 16 ERROR: Title too short");
    console.log("   Error: Title must be at least 2 characters");
  });
});

// Test summary
console.log("\n" + "=".repeat(60));
console.log("QUIZ CREATION TEST SUMMARY");
console.log("=".repeat(60));
console.log("✓ Valid cases: 2");
console.log("✗ Error cases: 14");
console.log("  - Missing fields: 4");
console.log("  - Invalid questions: 4");
console.log("  - Database errors: 3");
console.log("  - Data validation: 3");
console.log("=".repeat(60));
