import { Component, Inject, OnInit } from '@angular/core';
import { EventInterface } from '@sports-alliance/sports-lib/lib/events/event.interface';
import { AppEventService } from '../../services/app.event.service';
import { FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators, } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Sentry from '@sentry/browser';
import { ActivityInterface } from '@sports-alliance/sports-lib/lib/activities/activity.interface';
import { EventUtilities } from '@sports-alliance/sports-lib/lib/events/utilities/event.utilities';
import { User } from '@sports-alliance/sports-lib/lib/users/user';
import { take } from 'rxjs/operators';
import { DataDistance } from '@sports-alliance/sports-lib/lib/data/data.distance';
import { ActivityTypesHelper } from '@sports-alliance/sports-lib/lib/activities/activity.types';
import { ActivityUtilities } from '@sports-alliance/sports-lib/lib/events/utilities/activity.utilities';


@Component({
  selector: 'app-activity-form',
  templateUrl: './activity.crop.form.component.html',
  styleUrls: ['./activity.crop.form.component.css'],
  providers: [],
})


export class ActivityCropFormComponent implements OnInit {
  public activity: ActivityInterface;
  public event: EventInterface;
  public user: User;
  public activityTypesArray = ActivityTypesHelper.getActivityTypesAsUniqueArray();
  public activityFormGroup: FormGroup;
  public isLoading: boolean;


  constructor(
    public dialogRef: MatDialogRef<ActivityCropFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private eventService: AppEventService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) {
    this.activity = data.activity;
    this.event = data.event;
    this.user = data.user;
  }

  async ngOnInit() {
    if (!this.user || !this.event) {
      throw new Error('Component needs event and user')
    }

    // Set this to loading
    this.isLoading = true;

    // To use this component we need the full hydrated object and we might not have it
    this.activity.clearStreams();
    this.activity.addStreams(await this.eventService.getAllStreams(this.user, this.event.getID(), this.activity.getID()).pipe(take(1)).toPromise());
    // Now build the controls
    this.activityFormGroup = new FormGroup({});

    // Find the starting distance for this activity
    this.activityFormGroup.addControl('startDistance', new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(this.activity.getSquashedStreamData(DataDistance.type)[this.activity.getSquashedStreamData(DataDistance.type).length - 1]),
    ]));
    this.activityFormGroup.addControl('endDistance', new FormControl(this.activity.getSquashedStreamData(DataDistance.type)[this.activity.getSquashedStreamData(DataDistance.type).length - 1], [
      Validators.required,
      Validators.min(0),
      Validators.max(this.activity.getSquashedStreamData(DataDistance.type)[this.activity.getSquashedStreamData(DataDistance.type).length - 1]),
    ]));

    this.activityFormGroup.setValidators([activityDistanceValidator]);
    // Set this to done loading
    this.isLoading = false;
  }

  hasError(field?: string) {
    if (!field) {
      return !this.activityFormGroup.valid;
    }
    return !(this.activityFormGroup.get(field).valid && this.activityFormGroup.get(field).touched);
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.activityFormGroup.valid) {
      this.validateAllFormFields(this.activityFormGroup);
      return;
    }
    this.isLoading = true;

    try {
      ActivityUtilities.cropDistance(Number(this.activityFormGroup.get('startDistance').value), Number(this.activityFormGroup.get('endDistance').value), this.activity);
      this.activity.clearStats();
      ActivityUtilities.generateMissingStreamsAndStatsForActivity(this.activity);
      EventUtilities.reGenerateStatsForEvent(this.event);
      await this.eventService.writeAllEventData(this.user, this.event);
      this.snackBar.open('Activity saved', null, {
        duration: 2000,
      });
    } catch (e) {
      // debugger;
      Sentry.captureException(e);

      this.snackBar.open('Could not save activity', null, {
        duration: 2000,
      });
      Sentry.captureException(e);
    } finally {
      this.isLoading = false;
      this.dialogRef.close();
    }
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({onlySelf: true});
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }

  close(event) {
    event.stopPropagation();
    event.preventDefault();
    this.dialogRef.close();
  }

  private getTimeFromDateAsString(date: Date): string {
    return `${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}:${('0' + date.getSeconds()).slice(-2)}`
  }
}


export const activityDistanceValidator: ValidatorFn = (control: FormGroup): ValidationErrors | null => {
  const startDistance = control.get('startDistance');
  const endDistance = control.get('endDistance');

  if (endDistance.value <= startDistance.value) {
    return {'endDistanceSmallerThanStartDistance': true};
  }
  return null;
};

export const autocompleteSelectionValidator: ValidatorFn = (control: FormControl): ValidationErrors | null => {
  const selection: any = control.value;
  if (typeof selection === 'string') {
    return {requireMatch: true};
  }
  return null;
}
