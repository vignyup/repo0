import { v4 as uuidv4 } from "uuid"
import type { Project, Task, CustomField } from "./types"

// Sample data for fallback when database connection fails
const sampleProjects: Project[] = [
  {
    id: "1",
    title: "Website Redesign",
    description: "Tasks and timeline for the company website redesign",
    status: "active",
    taskCount: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Mobile App Development",
    description: "Planning and execution of the new mobile application",
    status: "active",
    taskCount: 18,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Q4 Marketing Campaign",
    description: "Planning and execution of Q4 marketing initiatives",
    status: "planning",
    taskCount: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const sampleTasks: Record<string, Task[]> = {
  "1": [
    {
      id: "task-1",
      projectId: "1",
      title: "Design Homepage Mockup",
      description: "Create a mockup for the new homepage design based on the approved wireframes.",
      status: "done",
      priority: "high",
      assignee: {
        name: "Jane Smith",
        initials: "JS",
      },
      dueDate: "2023-11-15",
      comments: 3,
      order: 0,
    },
    {
      id: "task-2",
      projectId: "1",
      title: "Implement Navigation Component",
      description: "Develop the responsive navigation component for the website.",
      status: "in-progress",
      priority: "medium",
      assignee: {
        name: "John Doe",
        initials: "JD",
      },
      dueDate: "2023-11-20",
      comments: 1,
      order: 1,
    },
    {
      id: "task-3",
      projectId: "1",
      title: "Optimize Image Loading",
      description: "Implement lazy loading for images to improve page load performance.",
      status: "todo",
      priority: "low",
      dueDate: "2023-11-25",
      comments: 0,
      order: 2,
    },
    {
      id: "task-4",
      projectId: "1",
      title: "Write Content for About Page",
      description: "Create compelling content for the About Us page highlighting company values and mission.",
      status: "review",
      priority: "medium",
      assignee: {
        name: "Jane Smith",
        initials: "JS",
      },
      dueDate: "2023-11-18",
      comments: 2,
      order: 3,
    },
  ],
  "2": [
    {
      id: "task-5",
      projectId: "2",
      title: "Design App Wireframes",
      description: "Create wireframes for the mobile app UI.",
      status: "done",
      priority: "high",
      assignee: {
        name: "Jane Smith",
        initials: "JS",
      },
      dueDate: "2023-10-15",
      comments: 5,
      order: 0,
    },
    {
      id: "task-6",
      projectId: "2",
      title: "Implement Authentication",
      description: "Set up user authentication flow for the mobile app.",
      status: "in-progress",
      priority: "high",
      assignee: {
        name: "John Doe",
        initials: "JD",
      },
      dueDate: "2023-11-05",
      comments: 2,
      order: 1,
    },
  ],
  "3": [
    {
      id: "task-7",
      projectId: "3",
      title: "Define Campaign Goals",
      description: "Set clear objectives and KPIs for the Q4 marketing campaign.",
      status: "done",
      priority: "high",
      assignee: {
        name: "Jane Smith",
        initials: "JS",
      },
      dueDate: "2023-09-30",
      comments: 3,
      order: 0,
    },
  ],
}

const sampleCustomFields: Record<string, CustomField[]> = {
  "1": [
    {
      id: "cf-1",
      projectId: "1",
      name: "Story Points",
      type: "number",
      isRequired: false,
    },
    {
      id: "cf-2",
      projectId: "1",
      name: "Platform",
      type: "select",
      options: ["Desktop", "Mobile", "Both"],
      isRequired: true,
    },
  ],
  "2": [
    {
      id: "cf-3",
      projectId: "2",
      name: "Device",
      type: "select",
      options: ["iOS", "Android", "Cross-platform"],
      isRequired: true,
    },
  ],
}

// In-memory storage for dynamic data
const dynamicProjects: Project[] = [...sampleProjects]
const dynamicTasks: Record<string, Task[]> = { ...sampleTasks }
const dynamicCustomFields: Record<string, CustomField[]> = { ...sampleCustomFields }

// Mock database implementation
export const mockDb = {
  // Project operations
  getProjects: async (): Promise<Project[]> => {
    return [...dynamicProjects]
  },

  getProject: async (id: string): Promise<Project> => {
    const project = dynamicProjects.find((p) => p.id === id)
    if (!project) {
      throw new Error(`Project with ID ${id} not found`)
    }
    return { ...project }
  },

  addProject: async (project: Omit<Project, "id" | "taskCount">): Promise<Project> => {
    const newProject = {
      ...project,
      id: uuidv4(),
      taskCount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    dynamicProjects.push(newProject)
    dynamicTasks[newProject.id] = []
    return { ...newProject }
  },

  updateProject: async (id: string, projectData: Partial<Project>): Promise<Project> => {
    const index = dynamicProjects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with ID ${id} not found`)
    }

    const updatedProject = {
      ...dynamicProjects[index],
      ...projectData,
      updated_at: new Date().toISOString(),
    }
    dynamicProjects[index] = updatedProject
    return { ...updatedProject }
  },

  deleteProject: async (id: string): Promise<{ success: boolean }> => {
    const index = dynamicProjects.findIndex((p) => p.id === id)
    if (index !== -1) {
      dynamicProjects.splice(index, 1)
      delete dynamicTasks[id]
      delete dynamicCustomFields[id]
    }
    return { success: true }
  },

  // Task operations
  getProjectTasks: async (projectId: string): Promise<Task[]> => {
    return dynamicTasks[projectId] ? [...dynamicTasks[projectId]] : []
  },

  getTask: async (id: string): Promise<Task> => {
    for (const projectId in dynamicTasks) {
      const task = dynamicTasks[projectId].find((t) => t.id === id)
      if (task) {
        return { ...task }
      }
    }
    throw new Error(`Task with ID ${id} not found`)
  },

  addTask: async (task: Omit<Task, "id" | "comments">): Promise<Task> => {
    if (!dynamicTasks[task.projectId]) {
      dynamicTasks[task.projectId] = []
    }

    // Find the highest order value
    const maxOrder =
      dynamicTasks[task.projectId].length > 0 ? Math.max(...dynamicTasks[task.projectId].map((t) => t.order || 0)) : -1

    const newTask = {
      ...task,
      id: uuidv4(),
      comments: 0,
      order: maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    dynamicTasks[task.projectId].push(newTask)

    // Update project task count
    const projectIndex = dynamicProjects.findIndex((p) => p.id === task.projectId)
    if (projectIndex !== -1) {
      dynamicProjects[projectIndex].taskCount = (dynamicProjects[projectIndex].taskCount || 0) + 1
    }

    return { ...newTask }
  },

  updateTask: async (id: string, taskData: Partial<Task>): Promise<Task> => {
    for (const projectId in dynamicTasks) {
      const index = dynamicTasks[projectId].findIndex((t) => t.id === id)
      if (index !== -1) {
        const updatedTask = {
          ...dynamicTasks[projectId][index],
          ...taskData,
          updated_at: new Date().toISOString(),
        }
        dynamicTasks[projectId][index] = updatedTask
        return { ...updatedTask }
      }
    }
    throw new Error(`Task with ID ${id} not found`)
  },

  deleteTask: async (id: string): Promise<{ success: boolean }> => {
    for (const projectId in dynamicTasks) {
      const index = dynamicTasks[projectId].findIndex((t) => t.id === id)
      if (index !== -1) {
        dynamicTasks[projectId].splice(index, 1)

        // Update project task count
        const projectIndex = dynamicProjects.findIndex((p) => p.id === projectId)
        if (projectIndex !== -1) {
          dynamicProjects[projectIndex].taskCount = Math.max(0, (dynamicProjects[projectIndex].taskCount || 1) - 1)
        }

        return { success: true }
      }
    }
    return { success: true }
  },

  reorderTasks: async (taskIds: string[], newOrders: number[]): Promise<{ success: boolean }> => {
    // Find which project these tasks belong to
    let projectId = null
    for (const pId in dynamicTasks) {
      if (dynamicTasks[pId].some((t) => t.id === taskIds[0])) {
        projectId = pId
        break
      }
    }

    if (projectId) {
      taskIds.forEach((taskId, index) => {
        const taskIndex = dynamicTasks[projectId].findIndex((t) => t.id === taskId)
        if (taskIndex !== -1) {
          dynamicTasks[projectId][taskIndex].order = newOrders[index]
        }
      })

      // Sort tasks by order
      dynamicTasks[projectId].sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    return { success: true }
  },

  // Custom field operations
  getProjectCustomFields: async (projectId: string): Promise<CustomField[]> => {
    return dynamicCustomFields[projectId] ? [...dynamicCustomFields[projectId]] : []
  },

  addCustomField: async (field: Omit<CustomField, "id">): Promise<CustomField> => {
    if (!dynamicCustomFields[field.projectId]) {
      dynamicCustomFields[field.projectId] = []
    }

    const newField = {
      ...field,
      id: uuidv4(),
    }

    dynamicCustomFields[field.projectId].push(newField)
    return { ...newField }
  },

  deleteCustomField: async (id: string): Promise<{ success: boolean }> => {
    for (const projectId in dynamicCustomFields) {
      const index = dynamicCustomFields[projectId].findIndex((f) => f.id === id)
      if (index !== -1) {
        dynamicCustomFields[projectId].splice(index, 1)
        return { success: true }
      }
    }
    return { success: true }
  },
}
