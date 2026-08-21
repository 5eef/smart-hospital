<?php

return [
    'required' => 'The :attribute field is required.',
    'email' => 'The :attribute field must be a valid email address.',
    'unique' => 'The :attribute has already been taken.',
    'confirmed' => 'The :attribute confirmation does not match.',
    'string' => 'The :attribute field must be a string.',
    'integer' => 'The :attribute field must be an integer.',
    'boolean' => 'The :attribute field must be true or false.',
    'date' => 'The :attribute field must be a valid date.',
    'after' => 'The :attribute field must be after :date.',
    'exists' => 'The selected :attribute is invalid.',
    'in' => 'The selected :attribute is invalid.',
    'min' => ['string' => 'The :attribute field must be at least :min characters.', 'numeric' => 'The :attribute field must be at least :min.'],
    'max' => ['string' => 'The :attribute field must not exceed :max characters.', 'numeric' => 'The :attribute field must not exceed :max.'],
];
