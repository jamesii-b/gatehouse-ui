import { useState, useEffect, useRef } from "react";
import {
  Plus, Copy, Trash2, Loader2, AlertCircle, CheckCircle, MoreHorizontal, Edit2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, OrganizationApiKey } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/contexts/OrgContext";
import { formatDate } from "@/lib/date";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NewApiKeyState {
  key: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface EditingKey {
  id: string;
  name: string;
  description: string | null;
}

function useCopyButton() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const { selectedOrgId: orgId } = useOrg();
  const queryClient = useQueryClient();
  const { copy, copied } = useCopyButton();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<NewApiKeyState | null>(null);
  const [editingKey, setEditingKey] = useState<EditingKey | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement>(null);

  // Fetch API keys
  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys', orgId],
    queryFn: () => orgId ? api.organizations.getApiKeys(orgId) : null,
    enabled: !!orgId,
  });

  // Create API key mutation
  const { mutate: createKey, isPending: isCreatingKey } = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error('Organization ID not set');
      const name = nameRef.current?.value;
      const description = descriptionRef.current?.value;
      if (!name) throw new Error('Name is required');
      return api.organizations.createApiKey(orgId, name, description);
    },
    onSuccess: (data) => {
      const apiKey = data.api_key;
      setNewSecret({
        key: apiKey.key || '',
        name: apiKey.name,
        description: apiKey.description || undefined,
        createdAt: apiKey.created_at,
      });
      setIsCreateDialogOpen(false);
      if (nameRef.current) nameRef.current.value = '';
      if (descriptionRef.current) descriptionRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['api-keys', orgId] });
      toast({
        title: 'API Key Created',
        description: 'Store the key value securely - you won\'t be able to see it again.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to create API key',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update API key mutation
  const { mutate: updateKey, isPending: isUpdatingKey } = useMutation({
    mutationFn: () => {
      if (!orgId || !editingKey) throw new Error('Required data missing');
      return api.organizations.updateApiKey(orgId, editingKey.id, {
        name: editNameRef.current?.value,
        description: editDescriptionRef.current?.value,
      });
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys', orgId] });
      toast({
        title: 'API Key Updated',
        description: 'Changes saved successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update API key',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete API key mutation
  const { mutate: deleteKey, isPending: isDeletingKey } = useMutation({
    mutationFn: (keyId: string) => {
      if (!orgId) throw new Error('Organization ID not set');
      return api.organizations.deleteApiKey(orgId, keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', orgId] });
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been permanently removed.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to delete API key',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateKey = () => {
    setIsCreating(true);
    createKey();
    setIsCreating(false);
  };

  const handleEditKey = (key: OrganizationApiKey) => {
    setEditingKey({
      id: key.id,
      name: key.name,
      description: key.description,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateKey = () => {
    updateKey();
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      deleteKey(keyId);
    }
  };

  const apiKeys = apiKeysData?.api_keys || [];
  const activeKeys = apiKeys.filter(k => !k.is_revoked);
  const revokedKeys = apiKeys.filter(k => k.is_revoked);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">API Keys</h1>
          <p className="page-description">Manage API keys for programmatic access to your organization.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create API Key
        </Button>
      </div>

      {/* New key reveal banner */}
      {newSecret && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            API key created — copy it now, you won't see it again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all font-mono">
              {newSecret.key}
            </code>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(newSecret.key)}>
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>
          <button onClick={() => setNewSecret(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Key list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">No API keys yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create one to enable external integrations.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Create API Key
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {activeKeys.map((key) => (
                <div key={key.id} className="flex items-start gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{key.name}</span>
                      {key.last_used_at && (
                        <Badge variant="secondary" className="text-xs">
                          Last used {formatDate(key.last_used_at)}
                        </Badge>
                      )}
                    </div>
                    {key.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{key.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Created {formatDate(key.created_at)}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditKey(key)} className="cursor-pointer">
                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-destructive cursor-pointer"
                        disabled={isDeletingKey}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {revokedKeys.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revoked</span>
                  </div>
                  {revokedKeys.map((key) => (
                    <div key={key.id} className="flex items-center gap-4 px-4 py-3 opacity-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground line-through">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Revoked {formatDate(key.revoked_at || '')}
                          {key.revoke_reason && ` — ${key.revoke_reason}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external integrations. The key will be displayed only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                ref={nameRef}
                placeholder="e.g., Production Integration"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="key-description">Description (Optional)</Label>
              <Textarea
                id="key-description"
                ref={descriptionRef}
                placeholder="What is this key for?"
                className="mt-1 resize-none h-20"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating || isCreatingKey}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateKey}
                disabled={isCreating || isCreatingKey}
              >
                {isCreatingKey ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update the name and description of this API key.
            </DialogDescription>
          </DialogHeader>
          {editingKey && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-key-name">Key Name</Label>
                <Input
                  id="edit-key-name"
                  ref={editNameRef}
                  defaultValue={editingKey.name}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-key-description">Description (Optional)</Label>
                <Textarea
                  id="edit-key-description"
                  ref={editDescriptionRef}
                  defaultValue={editingKey.description || ''}
                  className="mt-1 resize-none h-20"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isUpdatingKey}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateKey}
                  disabled={isUpdatingKey}
                >
                  {isUpdatingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Key'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
