import { useState, useEffect, useRef } from "react";
import {
  Plus, Copy, Trash2, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, MoreHorizontal, Edit2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys for external integrations and programmatic access to your organization.
        </p>
      </div>

      {/* New key notification */}
      {newSecret && (
        <Card className="mb-6 border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              New API Key Created
            </CardTitle>
            <CardDescription>
              Store this key securely. You won't be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Key Name</Label>
              <p className="text-sm text-foreground mt-1">{newSecret.name}</p>
            </div>
            <div>
              <Label className="flex items-center justify-between">
                <span>API Key Value</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(newSecret.key)}
                  className="h-auto p-0 text-xs"
                >
                  {copied ? (
                    <span className="text-success flex items-center gap-1">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </span>
                  )}
                </Button>
              </Label>
              <code className="block text-xs bg-muted p-2 rounded mt-1 break-all text-foreground">
                {newSecret.key}
              </code>
            </div>
            <Button
              onClick={() => setNewSecret(null)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create button */}
      <div className="mb-6 flex justify-end">
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </Button>
      </div>

      {/* Active Keys */}
      {activeKeys.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-foreground">Active Keys</h2>
          <div className="space-y-2">
            {activeKeys.map((key) => (
              <Card key={key.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{key.name}</h3>
                        {key.last_used_at && (
                          <Badge variant="secondary" className="text-xs whitespace-nowrap">
                            Last used: {formatDate(key.last_used_at)}
                          </Badge>
                        )}
                      </div>
                      {key.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {key.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {formatDate(key.created_at)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditKey(key)}
                          className="cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteKey(key.id)}
                          className="text-destructive cursor-pointer"
                          disabled={isDeletingKey}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <div className="mb-6 opacity-60">
          <h2 className="text-lg font-semibold mb-3 text-foreground">Revoked Keys</h2>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <Card key={key.id} className="bg-muted/30">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground line-through">
                        {key.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Revoked {formatDate(key.revoked_at || '')}
                        {key.revoke_reason && ` - ${key.revoke_reason}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {apiKeys.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-foreground mb-1">No API Keys</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first API key to enable external integrations.
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      )}

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
