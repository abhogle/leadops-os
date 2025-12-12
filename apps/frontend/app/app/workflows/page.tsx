"use client";

/**
 * Workflows List Page
 * Milestone 19: Workflow Editor V1
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  industry: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const response = await fetch("/api/v1/workflows", {
        credentials: "include",
      });
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    router.push("/app/workflows/new");
  };

  const handleEdit = (id: string) => {
    router.push(`/app/workflows/${id}`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p>No workflows yet. Create your first workflow to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              onClick={() => handleEdit(workflow.id)}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{workflow.name}</h3>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {workflow.industry}
                    </span>
                    {workflow.isActive && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        Active
                      </span>
                    )}
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      v{workflow.version}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
