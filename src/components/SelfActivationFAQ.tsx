import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, AlertTriangle, Phone, Users, Clock, CheckCircle2 } from "lucide-react";

export function SelfActivationFAQ() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="phone-not-found">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                My phone number isn't found
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Try these steps:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Use the exact phone number from your registration confirmation email</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Make sure to enter exactly 10 digits: 5551234567</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                  <span>Check if someone else in your group registered with their phone</span>
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Still can't find it? Contact staff - they can help look up your registration by name or email.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="no-rfid">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                I see "Unassigned" - what does this mean?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs text-muted-foreground">Unassigned</Badge>
                <span className="text-sm">means you don't have an RFID wristband yet</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You need to visit the RFID Assignment station first to get your wristband, then come back here to activate it.
              </p>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Look for staff wearing ranger badges - they can direct you to the RFID Assignment area.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="group-vs-individual">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Should I activate just myself or my whole group?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm mb-1">Activate Just Yourself:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Your companions aren't here yet</li>
                    <li>• You want to start using services immediately</li>
                    <li>• Others prefer to activate themselves</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">Activate Entire Group:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• Everyone in your party is present</li>
                    <li>• You're the group organizer</li>
                    <li>• You want to handle everything at once</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Don't worry - you can always activate remaining people later!
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meal-plans">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                What do the meal plan badges mean?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Meal Plan A
                  </Badge>
                  <span className="text-sm text-muted-foreground">Shows which meal service you're registered for</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    No Meal Plan
                  </Badge>
                  <span className="text-sm text-muted-foreground">You're not registered for meal service</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your meal plan determines which dining services you can access during the event.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="activation-failed">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Activation failed - what should I do?
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Try these steps in order:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">1</span>
                  <span>Wait 30 seconds and try again</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">2</span>
                  <span>Check your internet connection</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">3</span>
                  <span>Contact staff if the problem continues</span>
                </div>
              </div>
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Staff can manually activate your account and troubleshoot any technical issues.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="need-help">
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                I need staff assistance
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Staff can help you with:
              </p>
              <div className="space-y-1 text-sm text-muted-foreground ml-4">
                <div>• Finding your registration by name or email</div>
                <div>• Manual activation if technical issues occur</div>
                <div>• RFID wristband assignment</div>
                <div>• Registration corrections or updates</div>
              </div>
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Have this information ready:</strong> Your full name, phone number, and registration confirmation email if available.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}