import {
  getProjects,
  getProject,
  addProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getTask,
  addTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getProjectCustomFields,
  addCustomField,
  deleteCustomField,
} from "./data"

import type { Project, Task, CustomField } from "./types"

/**
 * Storage Service - A centralized service for all data operations
 * This service provides a clean API for components to interact with the data layer
 */
export class StorageService {
  // Project operations
  static async getProjects() {
    return getProjects()
  }

  static async getProject(id: string) {
    return getProject(id)
  }

  static async createProject(project: Omit<Project, "id" | "taskCount">) {
    return addProject(project)
  }

  static async updateProject(id: string, projectData: Partial<Project>) {
    return updateProject(id, projectData)
  }

  static async deleteProject(id: string) {
    return deleteProject(id)
  }

  // Task operations
  static async getProjectTasks(projectId: string) {
    return getProjectTasks(projectId)
  }

  static async getTask(id: string) {
    return getTask(id)
  }

  static async createTask(task: Omit<Task, "id" | "comments">) {
    return addTask(task)
  }

  static async updateTask(id: string, taskData: Partial<Task>) {
    return updateTask(id, taskData)
  }

  static async deleteTask(id: string) {
    return deleteTask(id)
  }

  static async reorderTasks(taskIds: string[], newOrders: number[]) {
    return reorderTasks(taskIds, newOrders)
  }

  // Custom field operations
  static async getProjectCustomFields(projectId: string) {
    return getProjectCustomFields(projectId)
  }

  static async createCustomField(field: Omit<CustomField, "id">) {
    return addCustomField(field)
  }

  static async deleteCustomField(id: string) {
    return deleteCustomField(id)
  }

  // Utility methods
  static async searchTasks(projectId: string, query: string) {
    const tasks = await getProjectTasks(projectId)
    if (!query) return tasks

    const lowerQuery = query.toLowerCase()
    return tasks.filter(
      (task) => task.title.toLowerCase().includes(lowerQuery) || task.description.toLowerCase().includes(lowerQuery),
    )
  }

  // Data export/import
  static async exportProjectData(projectId: string) {
    // Get all project data including tasks and custom fields
    const [project, tasks, customFields] = await Promise.all([
      getProject(projectId),
      getProjectTasks(projectId),
      getProjectCustomFields(projectId),
    ])

    return {
      project,
      tasks,
      customFields,
      exportDate: new Date().toISOString(),
    }
  }

  static async importProjectData(data: any) {
    // Validate the import data
    if (!data.project || !data.tasks || !data.customFields) {
      throw new Error("Invalid import data format")
    }

    // Create the project first
    const newProject = await addProject({
      title: data.project.title,
      description: data.project.description,
      status: data.project.status,
    })

    // Create custom fields
    const customFieldMap = new Map()
    for (const field of data.customFields) {
      const newField = await addCustomField({
        projectId: newProject.id,
        name: field.name,
        type: field.type,
        options: field.options,
        isRequired: field.isRequired,
      })
      customFieldMap.set(field.id, newField.id)
    }

    // Create tasks with updated references
    for (const task of data.tasks) {
      // Map custom fields to new IDs
      const customFields = task.customFields ? {} : undefined
      if (task.customFields) {
        for (const [oldId, value] of Object.entries(task.customFields)) {
          const newId = customFieldMap.get(oldId)
          if (newId) {
            customFields[newId] = value
          }
        }
      }

      await addTask({
        projectId: newProject.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        tags: task.tags,
        customFields,
      })
    }

    return newProject
  }
}
