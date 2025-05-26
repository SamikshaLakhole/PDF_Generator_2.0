process.env.DB_FILENAME = "test.sqlite3";
process.env.DB_CLIENT = "sqlite3";

const fs = require("fs");
const path = require("path");
const { TemplateServices } = require("../Services/TemplateServices");
const TemplateModel = require("../Model/TemplateModel");

jest.mock("fs");
jest.mock("../Model/TemplateModel");

describe("TemplateServices - saveTemplate", () => {
  const templateService = new TemplateServices();

  const mockData = {
    filePath: "/uploads/template.docx",
    title: "WelcomeTemplate",
    description: "Welcome email template",
    cc: "cc@example.com",
    subject: "Welcome!",
    body: "Hello {{name}}, welcome to the team!",
    uploadedBy: "Yash",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should save template successfully", async () => {
    TemplateModel.insertTemplate.mockResolvedValue(1);
    fs.writeFileSync.mockImplementation(() => {});

    const result = await templateService.saveTemplate(
      mockData.filePath,
      mockData.title,
      mockData.description,
      mockData.cc,
      mockData.subject,
      mockData.body,
      mockData.uploadedBy
    );

    const expectedPath = path.join(
      __dirname,
      "../uploads/email_templates",
      `${mockData.title}.txt`
    );

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining(mockData.body),
      "utf8"
    );
    expect(TemplateModel.insertTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: mockData.title,
        description: mockData.description,
        filePath: mockData.filePath,
        uploadedBy: mockData.uploadedBy,
      })
    );
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("emailTemplatePath");
  });

  test("should throw error if writeFileSync fails", async () => {
    fs.writeFileSync.mockImplementation(() => {
      throw new Error("Failed to write");
    });

    await expect(
      templateService.saveTemplate(
        mockData.filePath,
        mockData.title,
        mockData.description,
        mockData.cc,
        mockData.subject,
        mockData.body,
        mockData.uploadedBy
      )
    ).rejects.toThrow("Failed to write");
  });

  test("should throw error if insertTemplate fails", async () => {
    fs.writeFileSync.mockImplementation(() => {});
    TemplateModel.insertTemplate.mockImplementation(() => {
      throw new Error("DB insert failed");
    });

    await expect(
      templateService.saveTemplate(
        mockData.filePath,
        mockData.title,
        mockData.description,
        mockData.cc,
        mockData.subject,
        mockData.body,
        mockData.uploadedBy
      )
    ).rejects.toThrow("DB insert failed");
  });
  describe("TemplateServices - getAllTemplates", () => {
    const templateService = new TemplateServices();

    test("should return all templates", async () => {
      const mockTemplates = [{ id: 1, title: "WelcomeTemplate" }];
      TemplateModel.getAllTemplates.mockResolvedValue(mockTemplates);

      const result = await templateService.getAllTemplates();
      expect(result).toEqual(mockTemplates);
      expect(TemplateModel.getAllTemplates).toHaveBeenCalled();
    });
  });

  describe("TemplateServices - getTemplateById", () => {
    const templateService = new TemplateServices();

    test("should return template by ID", async () => {
      const mockTemplate = { id: 1, title: "WelcomeTemplate" };
      TemplateModel.getTemplateById.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplateById(1);
      expect(result).toEqual(mockTemplate);
      expect(TemplateModel.getTemplateById).toHaveBeenCalledWith(1);
    });
  });

  describe("TemplateServices - updateTemplate", () => {
    const templateService = new TemplateServices();

    const existingTemplate = {
      id: 1,
      title: "OldTemplate",
      description: "Old Description",
      email_template_path: "/uploads/email_templates/OldTemplate.txt",
    };

    const updatedData = {
      title: "UpdatedTemplate",
      description: "New Desc",
      cc: "newcc@example.com",
      subject: "New Subject",
      body: "New body content",
    };

    beforeEach(() => {
      jest.clearAllMocks();
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        "CC: oldcc@example.com\nSubject: Old\n\nOld body content"
      );
      fs.renameSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementation(() => {});
    });

    test("should update the template successfully", async () => {
      TemplateModel.getTemplateById.mockResolvedValue(existingTemplate);
      TemplateModel.updateTemplate.mockResolvedValue(true);

      const result = await templateService.updateTemplate(1, updatedData);

      expect(result).toHaveProperty("message", "Template updated successfully");
      expect(fs.renameSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(TemplateModel.updateTemplate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: updatedData.title,
          description: updatedData.description,
        })
      );
    });

    test("should throw error if template not found", async () => {
      TemplateModel.getTemplateById.mockResolvedValue(null);

      await expect(
        templateService.updateTemplate(99, updatedData)
      ).rejects.toThrow("Template not found");
    });

    test("should throw error if email file not found", async () => {
      TemplateModel.getTemplateById.mockResolvedValue(existingTemplate);
      fs.existsSync.mockReturnValue(false);

      await expect(
        templateService.updateTemplate(1, updatedData)
      ).rejects.toThrow("Email template file not found at");
    });

    test("should skip renaming if new file already exists", async () => {
      TemplateModel.getTemplateById.mockResolvedValue(existingTemplate);
      fs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true);

      await expect(
        templateService.updateTemplate(1, updatedData)
      ).resolves.toBeDefined();
      expect(fs.renameSync).not.toHaveBeenCalled();
    });
  });

  describe("TemplateServices - deleteTemplate", () => {
    const templateService = new TemplateServices();

    test("should soft delete template", async () => {
      TemplateModel.softDeleteTemplate.mockResolvedValue("Deleted");
      const result = await templateService.deleteTemplate(1);
      expect(result).toBe("Deleted");
      expect(TemplateModel.softDeleteTemplate).toHaveBeenCalledWith(1);
    });
  });
});
