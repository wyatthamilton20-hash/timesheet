"use client";

import { useState } from "react";
import { useTimesheet } from "@/context/timesheet-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Trash2 } from "lucide-react";

export function SettingsDialog() {
  const { state, dispatch } = useTimesheet();
  const [rate, setRate] = useState(String(state.hourlyRate));
  const [confirmClear, setConfirmClear] = useState(false);
  const [open, setOpen] = useState(false);

  function handleSaveRate() {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch({ type: "SET_RATE", payload: parsed });
    }
  }

  function handleClearAll() {
    if (confirmClear) {
      dispatch({ type: "CLEAR_ALL" });
      setConfirmClear(false);
      setOpen(false);
    } else {
      setConfirmClear(true);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setRate(String(state.hourlyRate));
          setConfirmClear(false);
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Settings className="size-5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="rate">Hourly Rate ($)</Label>
            <div className="flex gap-2">
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <Button onClick={handleSaveRate}>Save</Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-destructive">Danger Zone</Label>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleClearAll}
            >
              <Trash2 className="size-4 mr-1.5" />
              {confirmClear ? "Click again to confirm" : "Clear All Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
